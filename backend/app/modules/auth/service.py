from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.security import get_password_hash, verify_password, create_access_token
from app.modules.auth.models import User, Role, Department
from app.modules.auth.schemas import UserRegisterRequest, UserLoginRequest, TokenResponse, DepartmentOption

def get_department_options(db: Session) -> List[DepartmentOption]:
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

def register_user(db: Session, payload: UserRegisterRequest) -> TokenResponse:
    existing_user = db.query(User).filter(User.username == payload.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại trong hệ thống.")

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
        is_active=True
    )
    new_user.roles.append(role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.user_id), "role": "user"})
    return TokenResponse(
        access_token=token,
        user_id=str(new_user.user_id),
        username=str(new_user.username),
        full_name=str(new_user.full_name),
        role="user",
        department=str(new_user.department) if new_user.department else None,
        phone=str(new_user.phone) if new_user.phone else None
    )

def authenticate_user(db: Session, payload: UserLoginRequest) -> TokenResponse:
    user = db.query(User).filter(User.username == payload.username).first()

    if not user and payload.username == "admin":
        role_admin = db.query(Role).filter((Role.role_code == "admin") | (Role.role_code == "ADMIN")).first()
        if not role_admin:
            role_admin = Role(role_code="admin", role_name="Quản trị hệ thống", description="Admin tổng")
            db.add(role_admin)
            db.commit()
            db.refresh(role_admin)

        user = User(
            username="admin",
            password_hash=get_password_hash("123456"),
            full_name="Quản trị viên hệ thống",
            department="Phòng CNTT & Hệ thống",
            phone="0912.888.999",
            is_active=True
        )
        user.roles.append(role_admin)
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user or not verify_password(payload.password, str(user.password_hash)):
        raise HTTPException(status_code=400, detail="Sai tên đăng nhập hoặc mật khẩu.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị tạm khóa.")

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
        phone=str(user.phone) if user.phone else None
    )

def get_current_user_profile(db: Session, user_id: str) -> TokenResponse:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

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
        phone=str(user.phone) if user.phone else None
    )
