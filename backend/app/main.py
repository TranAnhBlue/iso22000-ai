import logging
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.dependencies import get_current_user
from app.core.migrations import run_migrations
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"[INTERNAL SERVER ERROR] {request.method} {request.url.path}: {exc}")
    
    # Trong môi trường production, không để lộ cấu trúc DB hoặc runtime exception
    is_prod = os.getenv("ENVIRONMENT", "production").lower() == "production"
    error_msg = "Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau." if is_prod else f"Lỗi máy chủ: {str(exc)}"

    return JSONResponse(
        status_code=500,
        content={"detail": error_msg},
    )

# Router xác thực công khai (login, register, departments)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(auth.router, prefix="", tags=["Authentication Direct Fallback"])

# Áp dụng xác thực mặc định (JWT Bearer Token) cho toàn bộ endpoint nghiệp vụ /api/v1.
# Khai báo tập trung giúp tránh vô tình bỏ sót dependency khi bổ sung module mới.
default_auth = [Depends(get_current_user)]
protected_router_specs = (
    (organization.router, "/api/v1", None),
    (documents.router, "/api/v1", None),
    (purchasing.router, "/api/v1", None),
    (haccp.router, "/api/v1", None),
    (change_management.router, "/api/v1/change-management", ["Change Management"]),
    (change_management.router, "/api/v1/changes", ["Change Management Alias"]),
    (equipment.router, "/api/v1/equipment", ["Equipment & Maintenance"]),
    (inventory.router, "/api/v1/inventory", ["Warehouse & Inventory FEFO"]),
    (traceability.router, "/api/v1/traceability", ["Traceability & Mock Recall"]),
    (capa.router, "/api/v1/capa", ["CAPA & Non-Conformance"]),
    (audits.router, "/api/v1/audits", ["Internal Audit, Training & Health"]),
    (dashboard.router, "/api/v1/dashboard", ["Executive Dashboard & Management Review"]),
    (emergency.router, "/api/v1/emergency", ["Emergency Preparedness & Response"]),
    (builder.router, "/api/v1/builders", ["Dynamic Form & Workflow Builders"]),
    (builder.router, "/api/v1/builder", ["Dynamic Form & Workflow Builders Alias"]),
)

for router, prefix, tags in protected_router_specs:
    include_options = {"prefix": prefix, "dependencies": default_auth}
    if tags:
        include_options["tags"] = tags
    app.include_router(router, **include_options)

@app.get("/")
def root():
    return {
        "status": "online",
        "app": "WCERT ISO 22000 FSMS Backend API",
        "version": "1.0.0",
        "docs": "/docs",
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
