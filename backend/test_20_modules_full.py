"""Smoke test tĩnh cho 20 phân hệ FSMS.

Chạy bằng: PYTHONPATH=backend backend/venv/bin/python backend/test_20_modules_full.py

Test này không khởi động lifespan hoặc kết nối PostgreSQL. Mục đích là phát hiện
lỗi import, router chưa được đăng ký, schema/migration lệch nhau và regression
trong các luật bảo mật cơ bản. Các luồng CRUD cần PostgreSQL được kiểm thử riêng
trong môi trường integration.
"""

from __future__ import annotations

import re
from pathlib import Path

from pydantic import ValidationError

import app.main
from app.core.database import Base
from app.core.security import get_password_hash, verify_password
from app.modules.documents.schemas import (
    RecordRetentionCreate,
    RecordRetentionDispose,
    RecordRetentionUpdate,
)
from app.modules.haccp.router import water_measurements_failed
from app.modules.haccp.schemas import WaterSafetyRecordCreate


ROOT = Path(__file__).resolve().parents[1]

# Một endpoint đại diện cho từng phân hệ nghiệp vụ. Sự tồn tại của chúng xác nhận
# router đã được import và include vào ứng dụng FastAPI.
REQUIRED_ROUTES = {
    "auth": "/api/v1/auth/login",
    "organization": "/api/v1/organization/users",
    "documents": "/api/v1/documents",
    "purchasing": "/api/v1/purchasing/suppliers",
    "haccp": "/api/v1/haccp/plans",
    "change_management": "/api/v1/change-management/requests",
    "equipment": "/api/v1/equipment/equipments",
    "inventory": "/api/v1/inventory/stock",
    "traceability": "/api/v1/traceability/backward",
    "capa": "/api/v1/capa/ncs",
    "audits": "/api/v1/audits/audits",
    "dashboard": "/api/v1/dashboard/overview-stats",
    "emergency": "/api/v1/emergency/contacts",
    "builder": "/api/v1/builders/forms",
    "rbac": "/api/v1/organization/users",
    "dms": "/api/v1/documents/change-requests",
    "prp": "/api/v1/haccp/prp-programs",
    "ccp": "/api/v1/haccp/ccp-logs",
    "training": "/api/v1/audits/training/courses",
    "records_retention": "/api/v1/documents/retention",
}


def test_routes_registered() -> None:
    # FastAPI phiên bản hiện dùng `_IncludedRouter` và resolve route lười.
    # OpenAPI là nguồn chuẩn đã resolve, không khởi động lifespan/database.
    paths = set(app.main.app.openapi()["paths"])
    missing = {name: path for name, path in REQUIRED_ROUTES.items() if path not in paths}
    assert not missing, f"Router chưa được đăng ký: {missing}"


def test_auth_contract_for_public_and_dashboard_routes() -> None:
    """Keep unauthenticated health/login endpoints separate from protected data APIs.

    This is intentionally checked from OpenAPI so it stays dependency-free. A
    `401` on the two dashboard paths is correct when a browser has no valid JWT;
    it is not a reason to make the alerts public.
    """
    paths = app.main.app.openapi()["paths"]
    bearer = [{"HTTPBearer": []}]
    for path in (
        "/api/v1/dashboard/alerts/read-ids",
        "/api/v1/dashboard/executive-alerts",
    ):
        assert paths[path]["get"].get("security") == bearer, f"{path} must require Bearer JWT"

    assert "security" not in paths["/health"]["get"]
    assert "security" not in paths["/api/v1/auth/login"]["post"]


def test_dashboard_uses_document_model_field_names() -> None:
    dashboard_router = ROOT / "backend" / "app" / "modules" / "dashboard" / "router.py"
    source = dashboard_router.read_text(encoding="utf-8")
    assert "doc.document_code" not in source
    assert "doc.title" not in source
    assert "doc.department_name" not in source


def test_models_match_bootstrap_sql() -> None:
    sql = (ROOT / "iso22000_db.sql").read_text(encoding="utf-8")
    sql_tables = set(re.findall(r"CREATE TABLE IF NOT EXISTS\s+([a-z_]+)", sql, re.I))
    model_tables = set(Base.metadata.tables)
    assert model_tables == sql_tables, (
        f"Model/SQL không đồng bộ. Thiếu trong SQL: {sorted(model_tables - sql_tables)}; "
        f"Dư trong SQL: {sorted(sql_tables - model_tables)}"
    )


def test_dms_disposal_guards() -> None:
    base = {
        "record_code": "BM01-KSHS",
        "record_name": "Danh mục hồ sơ",
        "department": "Ban QLCL & ATTP",
        "storage_location": "Tủ hồ sơ QA",
    }
    for schema in (RecordRetentionCreate, RecordRetentionUpdate):
        try:
            schema(**base, status="DISPOSED") if schema is RecordRetentionCreate else schema(status="DISPOSED")
        except ValidationError:
            pass
        else:
            raise AssertionError(f"{schema.__name__} cho phép chuyển thẳng sang DISPOSED")

    disposal = RecordRetentionDispose(
        disposal_council="QA, Sản xuất, Hành chính",
        disposal_minutes_code="BBTH-2026-001",
        confirm_expired=True,
    )
    assert disposal.confirm_expired is True


def test_password_hashing() -> None:
    password = "SmokeTestPassword!2026"
    hashed = get_password_hash(password)
    assert hashed.startswith(("$2a$", "$2b$", "$2y$"))
    assert verify_password(password, hashed)
    assert not verify_password("incorrect", hashed)


def test_water_safety_limits() -> None:
    base = {"sampling_point": "Đầu ra RO"}
    assert not water_measurements_failed(WaterSafetyRecordCreate(**base))
    assert water_measurements_failed(WaterSafetyRecordCreate(**base, chlorine_ppm=1.1))
    assert water_measurements_failed(WaterSafetyRecordCreate(**base, turbidity_ntu=2.1))
    assert water_measurements_failed(WaterSafetyRecordCreate(**base, e_coli_cfu=1))


def main() -> None:
    tests = (
        test_routes_registered,
        test_auth_contract_for_public_and_dashboard_routes,
        test_dashboard_uses_document_model_field_names,
        test_models_match_bootstrap_sql,
        test_dms_disposal_guards,
        test_password_hashing,
        test_water_safety_limits,
    )
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print(f"PASS smoke coverage: {len(REQUIRED_ROUTES)} modules")


if __name__ == "__main__":
    main()
