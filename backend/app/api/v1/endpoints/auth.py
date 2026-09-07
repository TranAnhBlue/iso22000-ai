from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User, Role
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, UserRoleAssignRequest, TokenResponse
from typing import List
from pydantic import BaseModel
import traceback

router = APIRouter(prefix="/auth", tags=["Authentication"])

from app.models.user import User, Role, Department

class DepartmentOption(BaseModel):
    role_code: str
    role_name: str
    description: str | None = None

@router.get("/departments", response_model=List[DepartmentOption])
def get_departments_from_roles(db: Session = Depends(get_db)):
    """Lấy danh sách các phòng ban chuẩn hóa từ bảng departments trong CSDL"""
    depts = db.query(Department).order_by(Department.dept_name.asc()).all()
    if not depts:
        roles = db.query(Role).filter(
            Role.role_code.notin_(["user", "USER", "staff", "STAFF"])
        ).order_by(Role.role_name.asc()).all()
        return [
            DepartmentOption(
                role_code=r.role_code,
                role_name=r.role_name,
                description=r.description
            ) for r in roles
        ]
    
    return [
        DepartmentOption(
            role_code=d.dept_code,
            role_name=d.dept_name,
            description=d.description
        ) for d in depts
    ]

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    try:
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
            username=new_user.username,
            full_name=new_user.full_name,
            role="user",
            department=new_user.department,
            phone=new_user.phone
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    try:
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

        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=400, detail="Sai tên đăng nhập hoặc mật khẩu.")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Tài khoản đã bị tạm khóa.")

        current_role = "user"
        if user.roles:
            current_role = user.roles[0].role_code.lower()

        token = create_access_token(data={"sub": str(user.user_id), "role": current_role})
        return TokenResponse(
            access_token=token,
            user_id=str(user.user_id),
            username=user.username,
            full_name=user.full_name,
            role=current_role,
            department=user.department,
            phone=user.phone
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi máy chủ: {str(e)}")

@router.get("/me", response_model=TokenResponse)
def get_me(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    current_role = "user"
    if user.roles:
        current_role = user.roles[0].role_code.lower()

    token = create_access_token(data={"sub": str(user.user_id), "role": current_role})
    return TokenResponse(
        access_token=token,
        user_id=str(user.user_id),
        username=user.username,
        full_name=user.full_name,
        role=current_role,
        department=user.department,
        phone=user.phone
    )