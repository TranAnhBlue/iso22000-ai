from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User, Role, user_roles
from app.schemas.organization import (
    UserOut, UserCreate, UserUpdate,
    DepartmentOut, DepartmentCreate, DepartmentUpdate
)
from typing import List

router = APIRouter(prefix="/organization", tags=["Organization"])

# ==================== USERS CRUD ====================

@router.get("/users", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    results = []
    for u in users:
        role_obj = u.roles[0] if u.roles else None
        role_label = role_obj.role_name if role_obj else "Chưa phân quyền"
        role_code = role_obj.role_code.lower() if role_obj else "user"
        results.append(
            UserOut(
                id=str(u.user_id),
                name=u.full_name,
                username=u.username,
                dept=u.department or "Chờ phân bổ",
                role_code=role_code,
                role=role_label,
                email=u.email,
                phone=u.phone,
                status="Hoạt động" if u.is_active else "Khoá"
            )
        )
    return results

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")

    role = db.query(Role).filter(
        (Role.role_code == payload.role_code.lower()) | 
        (Role.role_code == payload.role_code.upper()) |
        (Role.role_name == payload.role_code)
    ).first()

    new_user = User(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        full_name=payload.name,
        department=payload.dept,
        email=payload.email,
        phone=payload.phone,
        is_active=(payload.status == "Hoạt động")
    )
    if role:
        new_user.roles.append(role)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    role_label = role.role_name if role else "Chưa phân quyền"
    role_code = role.role_code.lower() if role else "user"

    return UserOut(
        id=str(new_user.user_id),
        name=new_user.full_name,
        username=new_user.username,
        dept=new_user.department or "",
        role_code=role_code,
        role=role_label,
        email=new_user.email,
        phone=new_user.phone,
        status="Hoạt động" if new_user.is_active else "Khoá"
    )

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if payload.name is not None:
        user.full_name = payload.name
    if payload.dept is not None:
        user.department = payload.dept
    if payload.email is not None:
        user.email = payload.email
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.status is not None:
        user.is_active = (payload.status == "Hoạt động")

    if payload.role_code is not None:
        role = db.query(Role).filter(
            (Role.role_code == payload.role_code.lower()) | 
            (Role.role_code == payload.role_code.upper()) |
            (Role.role_name == payload.role_code)
        ).first()
        if role:
            user.roles = [role]
            # Tự động đồng bộ tên phòng ban theo role nếu người dùng không chọn riêng
            if not payload.dept:
                user.department = role.role_name

    db.commit()
    db.refresh(user)

    role_obj = user.roles[0] if user.roles else None
    return UserOut(
        id=str(user.user_id),
        name=user.full_name,
        username=user.username,
        dept=user.department or "",
        role_code=role_obj.role_code.lower() if role_obj else "user",
        role=role_obj.role_name if role_obj else "Chưa phân quyền",
        email=user.email,
        phone=user.phone,
        status="Hoạt động" if user.is_active else "Khoá"
    )

@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    db.delete(user)
    db.commit()
    return {"message": "Đã xoá người dùng thành công"}


# ==================== DEPARTMENTS CRUD ====================

@router.get("/departments", response_model=List[DepartmentOut])
def get_departments(db: Session = Depends(get_db)):
    roles = db.query(Role).filter(Role.role_code.notin_(["user", "USER"])).order_by(Role.role_name.asc()).all()
    results = []
    for r in roles:
        # Tự động đếm số lượng tài khoản thuộc role này trong database
        count = db.query(func.count(User.user_id)).join(User.roles).filter(Role.role_id == r.role_id).scalar() or 0
        results.append(
            DepartmentOut(
                id=str(r.role_id),
                name=r.role_name,
                role_code=r.role_code,
                count=count,
                head="",
                description=r.description
            )
        )
    return results

@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db)):
    role_code = payload.role_code or payload.name.upper().replace(" ", "_")
    existing = db.query(Role).filter((Role.role_code == role_code) | (Role.role_name == payload.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phòng ban đã tồn tại")

    new_role = Role(
        role_code=role_code,
        role_name=payload.name,
        description=payload.description or f"Phòng ban {payload.name}"
    )
    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    return DepartmentOut(
        id=str(new_role.role_id),
        name=new_role.role_name,
        role_code=new_role.role_code,
        count=0,
        head="",
        description=new_role.description
    )

@router.put("/departments/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: str, payload: DepartmentUpdate, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.role_id == dept_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban")

    if payload.name is not None:
        role.role_name = payload.name
    if payload.description is not None:
        role.description = payload.description

    db.commit()
    db.refresh(role)

    count = db.query(func.count(User.user_id)).join(User.roles).filter(Role.role_id == role.role_id).scalar() or 0

    return DepartmentOut(
        id=str(role.role_id),
        name=role.role_name,
        role_code=role.role_code,
        count=count,
        head="",
        description=role.description
    )

@router.delete("/departments/{dept_id}")
def delete_department(dept_id: str, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.role_id == dept_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban")
    db.delete(role)
    db.commit()
    return {"message": "Đã xoá phòng ban thành công"}