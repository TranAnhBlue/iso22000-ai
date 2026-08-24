from pydantic import BaseModel
from typing import Optional

class UserRegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None

class UserLoginRequest(BaseModel):
    username: str
    password: str

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
    department: Optional[str]