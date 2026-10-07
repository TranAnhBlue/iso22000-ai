from pydantic import BaseModel, Field
from typing import Optional

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=10, max_length=100, description="Mật khẩu mạnh tối thiểu 10 ký tự")
    full_name: str = Field(..., min_length=2, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None

class UserLoginRequest(BaseModel):
    username: str = Field(..., min_length=2)
    password: str = Field(..., min_length=1)

class UserRoleAssignRequest(BaseModel):
    user_id: str
    role_code: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    full_name: str
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class UserProfileUpdateRequest(BaseModel):
    """Các trường người dùng được phép tự cập nhật cho chính mình.

    Vai trò và phòng ban thuộc phạm vi phân quyền của quản trị viên, không nhận
    từ API hồ sơ cá nhân để tránh tự ý nâng quyền hoặc chuyển phòng ban.
    """

    full_name: str = Field(..., min_length=2, max_length=100)
    email: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)

class DepartmentOption(BaseModel):
    role_code: str
    role_name: str
    description: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=10, description="Mật khẩu mạnh tối thiểu 10 ký tự")


class ResetPasswordRequest(BaseModel):
    username: str = Field(..., min_length=2)
    new_password: str = Field(..., min_length=10, description="Mật khẩu mạnh mới cho tài khoản")


from datetime import datetime
from uuid import UUID

class AuditLogResponse(BaseModel):
    log_id: UUID
    user_id: Optional[UUID] = None
    username: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
