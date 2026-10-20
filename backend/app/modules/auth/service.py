from typing import List, Optional, Dict, Any
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.security import get_password_hash, verify_password, create_access_token, validate_password_strength
from app.modules.auth.models import User, Role, Department, AuditLog
from app.modules.auth.schemas import UserRegisterRequest, UserLoginRequest, TokenResponse, DepartmentOption, RegistrationRequestResponse

def get_department_options(db: Session) -> List[DepartmentOption]:
    try:
        depts = db.query(Department).order_by(Department.dept_name.asc()).all()
        if not depts:
            roles = db.query(Role).filter(
                Role.role_code.notin_(["user", "USER", "staff", "STAFF"])
            ).order_by(Role.role_name.asc()).all()
            return [
                DepartmentOption(
                    role_code=str(r.role_code),
                    role_name=str(r.role_name),
                    description=str(r.description) if r.description else None
                ) for r in roles
            ]
        return [
            DepartmentOption(
                role_code=str(d.dept_code),
                role_name=str(d.dept_name),
                description=str(d.description) if d.description else None
            ) for d in depts
        ]
    except Exception:
        # Fallback danh sách 7 phòng ban chuẩn khi DB đang kết nối hoặc lỗi DNS
        fallback = [
            ("BGĐ", "Ban Giám đốc"),
            ("QAQC", "Ban QLCL & ATTP"),
            ("PROD", "Phòng Sản xuất"),
            ("SALES", "Phòng Kinh doanh & Kho"),
            ("EQUIP", "Phòng Thiết bị"),
            ("HR_ACC", "Phòng Hành chính - Kế toán"),
            ("SYS_ADMIN", "Quản trị hệ thống"),
        ]
        return [DepartmentOption(role_code=c, role_name=n) for c, n in fallback]

def register_user(db: Session, payload: UserRegisterRequest) -> RegistrationRequestResponse:
    existing_user = db.query(User).filter(User.username == payload.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại trong hệ thống.")

    password_error = validate_password_strength(payload.password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)

    role = db.query(Role).filter((Role.role_code == "user") | (Role.role_code == "USER")).first()
    if not role:
        role = Role(role_code="user", role_name="Người dùng chưa phân quyền", description="Tài khoản mới đăng ký")
        db.add(role)
        db.commit()
        db.refresh(role)

    new_user = User(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        full_name=payload.full_name,
        department=payload.department or "Chờ phân bổ",
        email=payload.email,
        phone=payload.phone,
        is_active=False,
        approval_status="PENDING",
    )
    new_user.roles.append(role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    create_audit_log(
        db,
        username=new_user.username,
        action="REGISTER_PENDING_APPROVAL",
        entity_type="AUTH",
        user_id=new_user.user_id,
        details={"department": new_user.department},
    )
    db.commit()
    return RegistrationRequestResponse(
        message="Đăng ký thành công. Tài khoản đang chờ Quản trị viên phê duyệt và phân quyền.",
        user_id=str(new_user.user_id),
        username=str(new_user.username),
    )

def authenticate_user(db: Session, payload: UserLoginRequest) -> TokenResponse:
    try:
        user = db.query(User).filter(User.username == payload.username).first()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Máy chủ cơ sở dữ liệu Supabase chưa sẵn sàng hoặc sai DATABASE_URL trên Render. Vui lòng kiểm tra lại kết nối database.",
        )

    if not user or not verify_password(payload.password, str(user.password_hash)):
        raise HTTPException(status_code=400, detail="Sai tên đăng nhập hoặc mật khẩu.")

    approval_status = str(getattr(user, "approval_status", "APPROVED")).upper()
    if approval_status == "PENDING":
        raise HTTPException(status_code=403, detail="Tài khoản đang chờ Quản trị viên phê duyệt và phân quyền.")
    if approval_status == "REJECTED":
        raise HTTPException(status_code=403, detail="Yêu cầu đăng ký tài khoản đã bị từ chối. Vui lòng liên hệ Quản trị viên.")
    if not user.is_active or approval_status == "SUSPENDED":
        raise HTTPException(status_code=403, detail="Tài khoản đã bị tạm khóa.")

    # Ghi nhận Audit Log đăng nhập thành công
    role_str = str(user.roles[0].role_code).lower() if user.roles else "user"
    create_audit_log(
        db,
        username=user.username,
        action="LOGIN",
        entity_type="AUTH",
        user_id=user.user_id,
        details={"role": role_str, "status": "SUCCESS"}
    )

    return format_user_profile(user)

def format_user_profile(user: User) -> TokenResponse:
    current_role = "user"
    if user.roles:
        current_role = str(user.roles[0].role_code).lower()

    token = create_access_token(data={"sub": str(user.user_id), "role": current_role})
    return TokenResponse(
        access_token=token,
        user_id=str(user.user_id),
        username=str(user.username),
        full_name=str(user.full_name),
        role=current_role,
        department=str(user.department) if user.department else None,
        phone=str(user.phone) if user.phone else None,
        email=str(user.email) if user.email else None,
    )

def get_current_user_profile(user: User) -> TokenResponse:
    return format_user_profile(user)


def create_audit_log(
    db: Session,
    username: Any,
    action: str,
    entity_type: str,
    user_id: Any = None,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = "127.0.0.1"
) -> AuditLog:
    """
    Ghi vết nhật ký an toàn (Audit Trail) cho các thao tác hệ thống FSMS
    """
    uid: Optional[uuid.UUID] = None
    if user_id is not None:
        if isinstance(user_id, uuid.UUID):
            uid = user_id
        else:
            try:
                uid = uuid.UUID(str(user_id))
            except (ValueError, TypeError):
                uid = None

    log = AuditLog(
        user_id=uid,
        username=str(username) if username is not None else "",
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
