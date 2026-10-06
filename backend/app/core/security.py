import bcrypt
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

raw_secret = os.getenv("SECRET_KEY")
env_mode = os.getenv("ENVIRONMENT", "development").lower().strip()
INSECURE_DEFAULT_SECRET = "secret_key_tam_thoi_iso22000_2026_wcert"

# Chặn hoàn toàn việc dùng khóa mặc định hoặc thiếu SECRET_KEY khi chạy production (fail-fast)
if env_mode == "production":
    if not raw_secret or raw_secret == INSECURE_DEFAULT_SECRET or len(raw_secret.strip()) < 32:
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: Biến môi trường 'SECRET_KEY' bắt buộc phải được cấu hình an toàn khi triển khai production! "
            "Khóa bí mật không được để trống, không được trùng với giá trị demo/mặc định và phải có độ dài tối thiểu 32 ký tự. "
            "Hệ thống dừng khởi động ngay lập tức (fail-fast) để đảm bảo an toàn xác thực và phân quyền."
        )
    SECRET_KEY = raw_secret.strip()
else:
    if not raw_secret or raw_secret == INSECURE_DEFAULT_SECRET:
        import logging
        logging.getLogger("uvicorn.error").warning(
            "[SECURITY WARNING] SECRET_KEY chưa được cấu hình an toàn trong .env. Sử dụng khóa tạm thời chỉ dành riêng cho môi trường development/local."
        )
        SECRET_KEY = raw_secret or "dev_insecure_secret_key_iso22000_local_only"
    else:
        SECRET_KEY = raw_secret.strip()

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))

def get_password_hash(password: str) -> str:
    """Tạo salt và băm mật khẩu an toàn bằng bcrypt (work factor 12) chống tấn công brute-force"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Xác thực mật khẩu an toàn, hỗ trợ bcrypt chuẩn và tương thích ngược salt$sha256"""
    try:
        if not hashed_password or not plain_password:
            return False

        # Định dạng bcrypt ($2b$, $2a$, $2y$)
        if hashed_password.startswith(("$2b$", "$2a$", "$2y$")):
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

        # Hỗ trợ tương thích ngược với hash cũ dạng salt$sha256_hash
        if "$" in hashed_password:
            salt, stored_hash = hashed_password.split("$", 1)
            calculated_hash = hashlib.sha256((salt + plain_password).encode("utf-8")).hexdigest()
            return secrets.compare_digest(calculated_hash, stored_hash)

        return False
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)