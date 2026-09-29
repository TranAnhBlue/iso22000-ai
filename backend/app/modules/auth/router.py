from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.auth.schemas import UserRegisterRequest, UserLoginRequest, TokenResponse, DepartmentOption
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
