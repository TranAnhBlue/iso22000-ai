from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.modules import (
    auth,
    organization,
    documents,
    purchasing,
    haccp,
    change_management,
    equipment,
    inventory,
    traceability,
    capa,
    audits,
    dashboard,
    emergency,
    builder,
)
from app.core.migrations import run_migrations

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Đồng bộ schema và chạy migrations tự động khi khởi động
    run_migrations()
    yield

app = FastAPI(
    title="WCERT ISO 22000:2018 FSMS API",
    version="1.0.0",
    lifespan=lifespan,
)

from fastapi.responses import JSONResponse
from fastapi.requests import Request

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://iso22000-ai.vercel.app",
    ],
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Lỗi máy chủ: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

# Các router chuẩn tiền tố /api/v1
app.include_router(auth.router, prefix="/api/v1")
app.include_router(organization.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(purchasing.router, prefix="/api/v1")
app.include_router(haccp.router, prefix="/api/v1")
app.include_router(change_management.router, prefix="/api/v1/change-management", tags=["Change Management"])
app.include_router(equipment.router, prefix="/api/v1/equipment", tags=["Equipment & Maintenance"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Warehouse & Inventory FEFO"])
app.include_router(traceability.router, prefix="/api/v1/traceability", tags=["Traceability & Mock Recall"])
app.include_router(capa.router, prefix="/api/v1/capa", tags=["CAPA & Non-Conformance"])
app.include_router(audits.router, prefix="/api/v1/audits", tags=["Internal Audit, Training & Health"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Executive Dashboard & Management Review"])
app.include_router(emergency.router, prefix="/api/v1/emergency", tags=["Emergency Preparedness & Response"])
app.include_router(builder.router, prefix="/api/v1")

# Router dự phòng trực tiếp nếu Frontend gọi /auth/login hoặc /auth/departments
app.include_router(auth.router, prefix="", tags=["Authentication Direct Fallback"])

@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {
        "status": "online",
        "app": "WCERT ISO 22000 FSMS Backend API",
        "version": "1.0.0",
        "docs": "/docs",
    }

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "healthy"}