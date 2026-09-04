from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User, Role, Department
from app.schemas.organization import (
    UserOut, UserCreate, UserUpdate,
    DepartmentOut, DepartmentCreate, DepartmentUpdate
)
from typing import List, Optional

router = APIRouter(prefix="/organization", tags=["Organization"])

def format_user_out(user: User) -> UserOut:
    """Chuyển đổi User ORM sang UserOut schema an toàn về kiểu dữ liệu"""
    role_obj = user.roles[0] if user.roles else None
    role_label = str(role_obj.role_name) if role_obj else "Chưa phân quyền"
    role_code = str(role_obj.role_code).lower() if role_obj else "user"
    return UserOut(
        id=str(user.user_id),
        name=str(user.full_name),
        username=str(user.username),
        dept=str(user.department or "Chờ phân bổ"),
        role_code=role_code,
        role=role_label,
        email=str(user.email) if user.email else None,
        phone=str(user.phone) if user.phone else None,
        status="Hoạt động" if user.is_active else "Khoá"
    )

def format_dept_out(dept: Department, count: int = 0) -> DepartmentOut:
    """Chuyển đổi Department ORM sang DepartmentOut schema an toàn về kiểu dữ liệu"""
    return DepartmentOut(
        id=str(dept.dept_id),
        name=str(dept.dept_name),
        role_code=str(dept.dept_code),
        count=int(count),
        head="",
        description=str(dept.description) if dept.description else None
    )

# ==================== USERS CRUD ====================

@router.get("/users", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db)):
    """Lấy danh sách người dùng trong hệ thống"""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [format_user_out(u) for u in users]

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    """Tạo mới tài khoản người dùng và gán vai trò phòng ban"""
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

    return format_user_out(new_user)

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin và phân quyền người dùng"""
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
            if not payload.dept:
                user.department = role.role_name

    db.commit()
    db.refresh(user)

    return format_user_out(user)

@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    """Xóa tài khoản người dùng"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    db.delete(user)
    db.commit()
    return {"message": "Đã xoá người dùng thành công"}


# ==================== DEPARTMENTS CRUD ====================

@router.get("/departments", response_model=List[DepartmentOut])
def get_departments(db: Session = Depends(get_db)):
    """Lấy danh sách các phòng ban và số lượng thành viên trực thuộc từ bảng departments"""
    depts = db.query(Department).order_by(Department.dept_name.asc()).all()
    results = []
    for d in depts:
        count = db.query(func.count(User.user_id)).filter(User.department == d.dept_name).scalar() or 0
        results.append(format_dept_out(d, int(count)))
    return results

@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db)):
    """Tạo mới phòng ban"""
    dept_code = payload.role_code or f"DEPT-{payload.name.upper().replace(' ', '_')}"
    existing = db.query(Department).filter(
        (Department.dept_code == dept_code) | (Department.dept_name == payload.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phòng ban đã tồn tại")

    new_dept = Department(
        dept_code=dept_code,
        dept_name=payload.name,
        description=payload.description or f"Phòng ban {payload.name}"
    )
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)

    return format_dept_out(new_dept, count=0)

@router.put("/departments/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: str, payload: DepartmentUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin phòng ban"""
    dept = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban")

    old_name = dept.dept_name
    if payload.name is not None and payload.name.strip():
        new_name = payload.name.strip()
        # Cập nhật tên phòng ban cho người dùng đang thuộc phòng này
        db.query(User).filter(User.department == old_name).update({User.department: new_name})
        dept.dept_name = new_name

    if payload.description is not None:
        dept.description = payload.description

    db.commit()
    db.refresh(dept)

    count = db.query(func.count(User.user_id)).filter(User.department == dept.dept_name).scalar() or 0
    return format_dept_out(dept, count=int(count))

@router.delete("/departments/{dept_id}")
def delete_department(dept_id: str, db: Session = Depends(get_db)):
    """Xóa phòng ban"""
    dept = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban")
    
    # Cập nhật phòng ban của nhân viên về "Chờ phân bổ"
    db.query(User).filter(User.department == dept.dept_name).update({User.department: "Chờ phân bổ"})
    db.delete(dept)
    db.commit()
    return {"message": "Đã xoá phòng ban thành công"}