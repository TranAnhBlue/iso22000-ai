from fastapi.testclient import TestClient
from app.core.security import get_password_hash, verify_password, validate_password_strength
from app.core.demo_data import demo_seed_enabled

def test_health_check(client: TestClient):
    """Health check endpoint should always respond 200 OK without auth."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "healthy" or "status" in data

def test_unauthenticated_protected_route_rejected(unauth_client: TestClient):
    """Any business router without JWT must return 401 Unauthorized."""
    endpoints_to_test = [
        "/api/v1/haccp/plans",
        "/api/v1/purchasing/suppliers",
        "/api/v1/documents",
        "/api/v1/inventory/stock",
        "/api/v1/capa/records",
        "/api/v1/audits/audits",
        "/api/v1/traceability/backward",
        "/api/v1/emergency/contacts",
    ]
    for ep in endpoints_to_test:
        resp = unauth_client.get(ep)
        assert resp.status_code == 401, f"Endpoint {ep} should require JWT auth but returned {resp.status_code}"

def test_security_password_hashing():
    """Verify that bcrypt password hashing and verification work as expected."""
    pwd = "StrongPassword@2026!"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword123", hashed) is False

def test_security_password_strength_validator():
    """Verify ISO 22000 password policy enforcement."""
    # Invalid passwords return error messages
    assert validate_password_strength("123") != ""
    assert validate_password_strength("weakpass") != ""
    # Valid strong password returns empty string
    assert validate_password_strength("AnGiang@FSMS2026") == ""

def test_demo_seed_disabled_by_default(client: TestClient):
    """Verify that demo seeding endpoints are locked (404/403) when ENABLE_DEMO_SEED is false."""
    assert demo_seed_enabled() is False, "demo_seed_enabled should default to False in production"

    seed_endpoints = [
        "/api/v1/traceability/seed-demo",
        "/api/v1/emergency/seed-demo",
        "/api/v1/capa/seed-demo",
        "/api/v1/audits/seed-demo",
        "/api/v1/builders/seed-defaults",
    ]
    for ep in seed_endpoints:
        resp = client.post(ep)
        assert resp.status_code in [403, 404], f"Seed endpoint {ep} should be blocked (403/404) but returned {resp.status_code}"
