from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path
from dotenv import load_dotenv

# Ưu tiên nạp .env.local nếu tồn tại để chạy PostgreSQL local biệt lập, không đụng .env Supabase deploy
_base_dir = Path(__file__).resolve().parent.parent.parent
_env_local = _base_dir / ".env.local"
if _env_local.exists():
    load_dotenv(_env_local, override=True)
else:
    load_dotenv()

DATABASE_URL = os.getenv("LOCAL_DATABASE_URL") or os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()