import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Mock remote migration execution during test initialization for instant execution
patch("app.core.migrations.run_migrations", lambda: None).start()

from app.main import app
from app.core.dependencies import get_current_user
from app.core.database import get_db
from app.modules.auth.models import User

class MockUser:
    user_id = "00000000-0000-0000-0000-000000000001"
    username = "admin_test"
    full_name = "Admin Test Auditor"
    email = "admin@wcert.vn"
    role = "admin"
    is_active = True
    department = "Ban QLCL & ATTP"

def mock_get_db():
    mock_session = MagicMock()
    try:
        yield mock_session
    finally:
        pass

@pytest.fixture
def mock_admin_user():
    return MockUser()

@pytest.fixture
def client(mock_admin_user):
    # Override get_current_user and get_db so tests run instantly and offline
    app.dependency_overrides[get_current_user] = lambda: mock_admin_user
    app.dependency_overrides[get_db] = mock_get_db
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def unauth_client():
    # Client with get_db mocked but auth NOT overridden (so 401 is tested properly)
    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = mock_get_db
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()
