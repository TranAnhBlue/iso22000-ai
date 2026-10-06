from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.security import verify_password, get_password_hash
from app.modules.auth.models import User, AuditLog
from app.modules.auth.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    DepartmentOption,
    ChangePasswordRequest,
    ResetPasswordRequest,
    AuditLogResponse,
)
from app.modules.auth import service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/departments", response_model=List[DepartmentOption])
def get_departments_from_roles(db: Session = Depends(get_db)):
    """Lấy danh sách các phòng ban chuẩn hóa từ bảng departments trong CSDL"""
    return service.get_department_options(db)

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    return service.register_user(db, payload)

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    return service.authenticate_user(db, payload)

@router.get("/me", response_model=TokenResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    user_id: Optional[str] = None,
):
    """
    Xác thực hồ sơ người dùng hiện tại thông qua Bearer JWT Token.
    Ngăn chặn việc giả mạo UUID qua query parameter.
    """
    if user_id and str(current_user.user_id) != user_id:
        user_roles = [str(r.role_code).lower() for r in current_user.roles]
        if "admin" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền truy cập hồ sơ của người dùng khác.",
            )
    return service.get_current_user_profile(current_user)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Đổi mật khẩu tài khoản với chính sách an toàn:
    - Bắt buộc kiểm tra mật khẩu hiện tại
    - Mật khẩu mới tối thiểu 6 ký tự
    - Tự động ghi nhận Sổ lưu vết Audit Log
    """
    if not verify_password(payload.old_password, str(current_user.password_hash)):
        service.create_audit_log(
            db,
            username=current_user.username,
            action="CHANGE_PASSWORD_FAILED",
            entity_type="AUTH",
            user_id=current_user.user_id,
            details={"reason": "Mật khẩu cũ không đúng"}
        )
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác.")

    if len(payload.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 6 ký tự.")

    current_user.password_hash = get_password_hash(payload.new_password.strip())
    db.commit()
    db.refresh(current_user)

    service.create_audit_log(
        db,
        username=current_user.username,
        action="CHANGE_PASSWORD",
        entity_type="AUTH",
        user_id=current_user.user_id,
        details={"result": "SUCCESS"}
    )
    return {"message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới."}


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Khôi phục mật khẩu tài khoản (Admin hoặc khôi phục an toàn):
    - Đặt lại mật khẩu về giá trị chỉ định hoặc mặc định (123456)
    - Tự động ghi nhận Sổ lưu vết Audit Log
    """
    target = db.scalar(select(User).where(User.username == payload.username.strip()))
    if not target:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tài khoản '{payload.username}'")

    new_pwd = payload.new_password or "123456"
    target.password_hash = get_password_hash(new_pwd.strip())
    db.commit()
    db.refresh(target)

    reset_by = current_user.username if current_user else "SELF_SERVICE"
    service.create_audit_log(
        db,
        username=target.username,
        action="RESET_PASSWORD",
        entity_type="AUTH",
        user_id=target.user_id,
        details={"reset_by": reset_by}
    )
    return {"message": f"Đã khôi phục mật khẩu thành công cho tài khoản '{target.username}'."}


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    username: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader")),
):
    """
    Truy vấn Sổ lưu vết Audit Trail cho các thao tác nhạy cảm hệ thống FSMS:
    Tuân thủ điều khoản 7.5.3 (Kiểm soát thông tin dạng văn bản) & Audit trail ISO 22000
    """
    stmt = select(AuditLog).order_by(desc(AuditLog.created_at))
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action.strip()}%"))
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type.strip())
    if username:
        stmt = stmt.where(AuditLog.username.ilike(f"%{username.strip()}%"))

    stmt = stmt.offset(offset).limit(limit)
    return db.scalars(stmt).all()
