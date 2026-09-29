from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.dependencies import get_current_user
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

import os
import logging

logger = logging.getLogger("uvicorn.error")

# Đọc cấu hình origins từ biến môi trường nếu có
custom_origins = os.getenv("CORS_ORIGINS", "").split(",")
allowed_origins_list = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://iso22000-ai.vercel.app",
]
for o in custom_origins:
    cleaned = o.strip()
    if cleaned and cleaned not in allowed_origins_list:
        allowed_origins_list.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,
    allow_origin_regex=r"^https://[a-zA-Z0-9_\-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"[INTERNAL SERVER ERROR] {request.method} {request.url.path}: {exc}")
    
    origin = request.headers.get("origin", "")
    # Trong môi trường production, không để lộ cấu trúc DB hoặc runtime exception
    is_prod = os.getenv("ENVIRONMENT", "production").lower() == "production"
    error_msg = "Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau." if is_prod else f"Lỗi máy chủ: {str(exc)}"

    return JSONResponse(
        status_code=500,
        content={"detail": error_msg},
        headers={
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

# Router xác thực công khai (login, register, departments)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(auth.router, prefix="", tags=["Authentication Direct Fallback"])

# Áp dụng xác thực mặc định (JWT Bearer Token) cho toàn bộ 240 endpoint nghiệp vụ /api/v1
default_auth = [Depends(get_current_user)]
app.include_router(organization.router, prefix="/api/v1", dependencies=default_auth)
app.include_router(documents.router, prefix="/api/v1", dependencies=default_auth)
app.include_router(purchasing.router, prefix="/api/v1", dependencies=default_auth)
app.include_router(haccp.router, prefix="/api/v1", dependencies=default_auth)
app.include_router(change_management.router, prefix="/api/v1/change-management", tags=["Change Management"], dependencies=default_auth)
app.include_router(equipment.router, prefix="/api/v1/equipment", tags=["Equipment & Maintenance"], dependencies=default_auth)
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Warehouse & Inventory FEFO"], dependencies=default_auth)
app.include_router(traceability.router, prefix="/api/v1/traceability", tags=["Traceability & Mock Recall"], dependencies=default_auth)
app.include_router(capa.router, prefix="/api/v1/capa", tags=["CAPA & Non-Conformance"], dependencies=default_auth)
app.include_router(audits.router, prefix="/api/v1/audits", tags=["Internal Audit, Training & Health"], dependencies=default_auth)
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Executive Dashboard & Management Review"], dependencies=default_auth)
app.include_router(emergency.router, prefix="/api/v1/emergency", tags=["Emergency Preparedness & Response"], dependencies=default_auth)
app.include_router(builder.router, prefix="/api/v1", dependencies=default_auth)

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