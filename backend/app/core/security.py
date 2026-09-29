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
    """Xác thực mật khẩu an toàn, chống timing attack, không dùng mật khẩu demo cứng"""
    try:
        if not hashed_password or not plain_password:
            return False

        # Định dạng chuẩn mới: salt$sha256_hash
        if "$" in hashed_password and not (hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$")):
            salt, stored_hash = hashed_password.split("$", 1)
            calculated_hash = hashlib.sha256((salt + plain_password).encode('utf-8')).hexdigest()
            return secrets.compare_digest(calculated_hash, stored_hash)

        # Hỗ trợ bcrypt cũ nếu database còn lưu chuỗi $2b$ / $2a$
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            try:
                import bcrypt
                return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
            except Exception:
                return False

        return False
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)