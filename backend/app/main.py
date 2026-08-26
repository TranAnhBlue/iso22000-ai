from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
import app.models  # ensure models are loaded
from app.api.v1.endpoints import auth, organization, documents, purchasing

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

        conn.commit()
except Exception as e:
    print(f"Database tables create_all note: {e}")

app = FastAPI(
    title="WCERT ISO 22000:2018 FSMS API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(organization.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(purchasing.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "WCERT ISO 22000 Backend API is running"}