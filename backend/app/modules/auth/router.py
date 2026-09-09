from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
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
def get_me(user_id: str, db: Session = Depends(get_db)):
    return service.get_current_user_profile(db, user_id)
