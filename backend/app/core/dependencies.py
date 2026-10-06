from __future__ import annotations
from typing import List, Optional, TYPE_CHECKING
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import SECRET_KEY, ALGORITHM
from app.core.authorization import has_any_role

if TYPE_CHECKING:
    from app.modules.auth.models import User

# HTTPBearer trích xuất Authorization: Bearer <token>
security_bearer = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    Xác thực Bearer JWT token từ request header.
    Giải mã token, kiểm tra tính hợp lệ và truy vấn User từ database.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu xác thực: Token không được cung cấp hoặc không hợp lệ.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không chứa định danh người dùng (sub).",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn phiên đăng nhập.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    from app.modules.auth.models import User
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Người dùng trong Token không tồn tại trên hệ thống.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị tạm khóa.",
        )

    return user


def require_roles(*allowed_roles: str):
    """
    Dependency kiểm tra phân quyền (RBAC) nghiêm ngặt ở cấp Backend.
    - Admin luôn có quyền truy cập toàn bộ hệ thống.
    - Kiểm tra xem người dùng có ít nhất một vai trò thuộc allowed_roles (hỗ trợ role_code và department).
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if has_any_role(current_user, allowed_roles):
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Quyền truy cập bị từ chối. Thao tác này yêu cầu một trong các vai trò: {', '.join(allowed_roles)}.",
        )

    return role_checker
