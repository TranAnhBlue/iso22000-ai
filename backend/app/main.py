from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
import app.models  # ensure models are loaded
from app.api.v1.endpoints import auth, organization, documents, purchasing, haccp

from sqlalchemy import text

try:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        # Documents columns migration
        conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS department VARCHAR(100);"))
        conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS standard VARCHAR(100);"))
        conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT;"))

        # Suppliers columns migration
        conn.execute(text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS category VARCHAR(100);"))
        conn.execute(text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS certifications JSONB;"))
        conn.execute(text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS risk_level VARCHAR(30) DEFAULT 'LOW';"))
        conn.execute(text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS evaluation_notes TEXT;"))
        conn.execute(text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS evaluation_date DATE;"))

        # Material Lots columns migration
        conn.execute(text("ALTER TABLE material_lots ADD COLUMN IF NOT EXISTS material_category VARCHAR(100);"))
        conn.execute(text("ALTER TABLE material_lots ADD COLUMN IF NOT EXISTS mfg_date DATE;"))
        conn.execute(text("ALTER TABLE material_lots ADD COLUMN IF NOT EXISTS exp_date DATE;"))
        conn.execute(text("ALTER TABLE material_lots ADD COLUMN IF NOT EXISTS storage_condition VARCHAR(100);"))
        conn.execute(text("ALTER TABLE material_lots ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'PENDING_IQC';"))

        # IQC Inspections columns migration
        conn.execute(text("ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS inspection_code VARCHAR(50);"))
        conn.execute(text("ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS packaging_check BOOLEAN DEFAULT TRUE;"))
        conn.execute(text("ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS temperature_c NUMERIC(5,2);"))
        conn.execute(text("ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS coa_compliance BOOLEAN DEFAULT TRUE;"))

        # CCP Definitions columns migration
        conn.execute(text("ALTER TABLE ccp_definitions ALTER COLUMN process_step DROP NOT NULL;"))
        conn.execute(text("ALTER TABLE ccp_definitions ADD COLUMN IF NOT EXISTS process_step_id UUID REFERENCES process_steps(step_id) ON DELETE SET NULL;"))
        conn.execute(text("ALTER TABLE ccp_definitions ADD COLUMN IF NOT EXISTS monitoring_method TEXT;"))
        conn.execute(text("ALTER TABLE ccp_definitions ADD COLUMN IF NOT EXISTS corrective_action_plan TEXT;"))
        conn.execute(text("ALTER TABLE ccp_definitions ADD COLUMN IF NOT EXISTS responsible_role VARCHAR(100) DEFAULT 'QC / Trưởng ca Sản xuất';"))
        conn.execute(text("ALTER TABLE ccp_definitions ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE';"))
        conn.execute(text("ALTER TABLE ccp_definitions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;"))

        # CCP Monitoring Logs columns migration
        conn.execute(text("ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);"))
        conn.execute(text("ALTER TABLE ccp_monitoring_logs ALTER COLUMN batch_id DROP NOT NULL;"))
        conn.execute(text("ALTER TABLE ccp_monitoring_logs ALTER COLUMN measured_values DROP NOT NULL;"))
        conn.execute(text("ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'NORMAL';"))
        conn.execute(text("ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT '°C';"))
        conn.execute(text("ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS measured_value NUMERIC(8,2);"))
        conn.execute(text("ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'VERIFIED';"))
        conn.execute(text("ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(user_id);"))
        conn.execute(text("ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS notes TEXT;"))
        conn.execute(text("ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;"))

        # PRP Programs & Checklists
        conn.execute(text("ALTER TABLE prp_programs ADD COLUMN IF NOT EXISTS group VARCHAR(50) DEFAULT 'GMP';"))
        conn.execute(text("ALTER TABLE prp_programs ADD COLUMN IF NOT EXISTS frequency VARCHAR(50) DEFAULT 'Theo ca sản xuất';"))
        conn.execute(text("ALTER TABLE prp_programs ADD COLUMN IF NOT EXISTS responsible_dept VARCHAR(100) DEFAULT 'Phòng Sản xuất';"))
        conn.execute(text("ALTER TABLE prp_programs ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE';"))

        conn.commit()
except Exception as e:
    print(f"Database tables create_all note: {e}")

app = FastAPI(
    title="WCERT ISO 22000:2018 FSMS API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(organization.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(purchasing.router, prefix="/api/v1")
app.include_router(haccp.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "WCERT ISO 22000 Backend API is running"}