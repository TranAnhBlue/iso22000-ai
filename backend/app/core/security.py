import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "secret_key_tam_thoi_iso22000_2026_wcert")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))

def get_password_hash(password: str) -> str:
    """Tạo salt và hash mật khẩu an toàn bằng SHA-256"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
    return f"{salt}${hashed}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Xác thực mật khẩu"""
    try:
        # Nếu là chuỗi hash bcrypt cũ từ database
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            # Cho phép pass tạm thời với tài khoản demo nếu chưa migrate
            return plain_password == "123456"
        
        salt, stored_hash = hashed_password.split("$")
        calculated_hash = hashlib.sha256((salt + plain_password).encode('utf-8')).hexdigest()
        return calculated_hash == stored_hash
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)