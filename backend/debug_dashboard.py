from app.core.database import SessionLocal, Base, engine
import app.models
from sqlalchemy import text
import traceback
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

with engine.connect() as conn:
    print("[MIGRATION] Kiem tra va cap nhat bang quality_objectives & management_reviews...")
    try:
        conn.execute(text("ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS objective_code VARCHAR(50);"))
        conn.execute(text("ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS clause_reference VARCHAR(50) DEFAULT '6.2';"))
        conn.execute(text("ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Toàn nhà máy';"))
        conn.execute(text("ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS unit VARCHAR(30) DEFAULT '%';"))
        conn.execute(text("ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS action_plan TEXT;"))
        conn.execute(text("ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS responsible_person VARCHAR(100) DEFAULT 'Trưởng Ban ISO';"))
        conn.execute(text("ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;"))
        conn.execute(text("ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;"))
        conn.execute(text("ALTER TABLE quality_objectives ALTER COLUMN target_value TYPE DOUBLE PRECISION;"))
        conn.execute(text("ALTER TABLE quality_objectives ALTER COLUMN actual_value TYPE DOUBLE PRECISION;"))

        conn.execute(text("ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS review_code VARCHAR(50);"))
        conn.execute(text("ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Cuộc họp xem xét lãnh đạo FSMS';"))
        conn.execute(text("ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS chairperson_name VARCHAR(100) DEFAULT 'Tổng Giám Đốc Trần Văn Hùng';"))
        conn.execute(text("ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS secretary_name VARCHAR(100) DEFAULT 'Trưởng Ban ISO Nguyễn Văn An';"))
        conn.execute(text("ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;"))
        conn.execute(text("ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS scope_and_inputs JSONB DEFAULT '{}'::jsonb;"))
        conn.execute(text("ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'DRAFT';"))
        conn.execute(text("ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;"))

        conn.commit()
        print("[MIGRATION] Migration hoàn tất thành công!")
    except Exception as e:
        print(f"[MIGRATION ERROR] {e}")

from app.api.v1.endpoints.dashboard import seed_default_dashboard_data
db = SessionLocal()
try:
    res = seed_default_dashboard_data(db)
    print("Seed success:", res)
except Exception as e:
    print("Seed error:")
    traceback.print_exc()
finally:
    db.close()
