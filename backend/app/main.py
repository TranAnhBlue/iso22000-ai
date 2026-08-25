from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
import app.models  # ensure models are loaded
from app.api.v1.endpoints import auth, organization, documents

from sqlalchemy import text

try:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS department VARCHAR(100);"))
        conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS standard VARCHAR(100);"))
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

@app.get("/")
def root():
    return {"message": "WCERT ISO 22000 Backend API is running"}