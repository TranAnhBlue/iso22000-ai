from pydantic import BaseModel, ConfigDict
from typing import Optional

# Schema Người dùng
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    username: str
    dept: str
    role_code: str
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str

class UserCreate(BaseModel):
    name: str
    username: str
    password: str = "123456"
    dept: str
    role_code: str
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str = "Hoạt động"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    dept: Optional[str] = None
    role_code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None

# Schema Phòng ban
class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    role_code: str
    count: int = 0
    head: str = ""
    description: Optional[str] = None

class DepartmentCreate(BaseModel):
    name: str
    head: Optional[str] = "Chưa bổ nhiệm"
    role_code: Optional[str] = None
    description: Optional[str] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    head: Optional[str] = None
    description: Optional[str] = None