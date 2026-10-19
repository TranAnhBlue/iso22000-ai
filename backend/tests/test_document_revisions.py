import pytest
import uuid
from datetime import date
from pydantic import ValidationError
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db
from app.modules.documents.schemas import (
    DocumentRevisionCreate,
    DocumentRevisionUpdate,
    DocumentRevisionApprove,
    DocumentRevisionReject,
    DocumentRevisionResponse,
)
from app.modules.documents.models import Document, DocumentRevision

def test_document_revision_schema_validation():
    """Verify ISO 22000 required fields on DocumentRevisionCreate schema."""
    # Missing change_description must raise ValidationError
    with pytest.raises(ValidationError):
        DocumentRevisionCreate.model_validate({
            "change_description": "",
            "drafter_name": "Nguyễn Văn A"
        })

    # Too short change_description must raise ValidationError
    with pytest.raises(ValidationError):
        DocumentRevisionCreate.model_validate({
            "change_description": "Fix",
            "drafter_name": "Nguyễn Văn A"
        })

    # Valid schema creation
    rev = DocumentRevisionCreate.model_validate({
        "version": "1.1",
        "change_description": "Cập nhật giới hạn kiểm soát nhiệt độ thanh trùng theo khuyến cáo mới của TCVN ISO 22000:2018",
        "content": "<p>Nội dung quy trình sửa đổi</p>",
        "drafter_name": "Kỹ sư QA Nguyễn Văn A"
    })
    assert rev.version == "1.1"
    assert "Cập nhật giới hạn" in rev.change_description

def test_document_revision_update_schema():
    """Verify revision update schema partial fields."""
    update = DocumentRevisionUpdate.model_validate({
        "change_description": "Bổ sung phụ lục hồ sơ giám sát CCP",
        "content": "<h1>Nội dung cập nhật</h1>"
    })
    assert update.change_description == "Bổ sung phụ lục hồ sơ giám sát CCP"
    assert update.content == "<h1>Nội dung cập nhật</h1>"
    assert update.version is None

def test_document_revision_approval_and_rejection_schemas():
    """Verify approve and reject schema payloads."""
    app_payload = DocumentRevisionApprove.model_validate({
        "approval_notes": "Đồng ý ban hành áp dụng chính thức toàn nhà máy",
        "effective_date": date(2026, 10, 20)
    })
    assert app_payload.effective_date == date(2026, 10, 20)

    rej_payload = DocumentRevisionReject.model_validate({
        "rejection_reason": "Chưa bổ sung chữ ký người soát xét chuyên môn"
    })
    assert rej_payload.rejection_reason == "Chưa bổ sung chữ ký người soát xét chuyên môn"

def test_document_revision_endpoints_not_found(client: TestClient):
    """Test 404 behavior for non-existent document or revision."""
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None
    app.dependency_overrides[get_db] = lambda: mock_db

    # Non-existent document revisions query
    resp = client.get(f"/api/v1/documents/{uuid.uuid4()}/revisions")
    assert resp.status_code == 404
    assert "Không tìm thấy tài liệu" in resp.json().get("detail", "")

    # Non-existent revision detail query
    resp = client.get(f"/api/v1/documents/revisions/{uuid.uuid4()}")
    assert resp.status_code == 404
    assert "Không tìm thấy bản sửa đổi" in resp.json().get("detail", "")

def test_document_revision_single_draft_rule(client: TestClient):
    """Test that ISO 22000 forbids creating multiple concurrent drafts on the same document."""
    mock_db = MagicMock()
    doc_id = uuid.uuid4()
    mock_doc = MagicMock(spec=Document)
    mock_doc.document_id = doc_id
    mock_doc.status = "APPROVED"

    mock_existing_draft = MagicMock(spec=DocumentRevision)
    mock_existing_draft.version = "1.1"
    mock_existing_draft.status = "DRAFT"

    # Query 1: doc check; Query 2: existing draft check
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_doc,
        mock_existing_draft,
    ]
    app.dependency_overrides[get_db] = lambda: mock_db

    resp = client.post(
        f"/api/v1/documents/{doc_id}/revisions",
        json={
            "change_description": "Cập nhật tài liệu lần 2",
            "drafter_name": "Kỹ sư QA"
        }
    )
    assert resp.status_code == 400
    assert "đang có bản sửa đổi" in resp.json().get("detail", "").lower()

def test_document_revision_maker_checker_rule(client: TestClient):
    """Test ISO 22000 Maker-Checker independence: drafter cannot approve own revision."""
    from app.modules.auth.models import User
    from app.core.dependencies import get_current_user

    mock_db = MagicMock()
    user_id = uuid.uuid4()
    rev_id = uuid.uuid4()

    mock_user = MagicMock(spec=User)
    mock_user.user_id = user_id
    mock_user.role = "qa"  # not admin or director
    mock_user.roles = []
    mock_user.department = "Ban QLCL & ATTP"
    mock_user.is_active = True

    mock_rev = MagicMock(spec=DocumentRevision)
    mock_rev.revision_id = rev_id
    mock_rev.drafter_id = user_id  # Same as current user!
    mock_rev.status = "UNDER_REVIEW"

    mock_db.query.return_value.filter.return_value.first.return_value = mock_rev
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user

    resp = client.post(
        f"/api/v1/documents/revisions/{rev_id}/approve",
        json={"approval_notes": "Tự duyệt"}
    )
    assert resp.status_code == 400
    assert "người soạn thảo không được tự phê duyệt" in resp.json().get("detail", "").lower()

def test_document_revision_delete_protection(client: TestClient):
    """Test that approved/effective revisions cannot be deleted."""
    mock_db = MagicMock()
    rev_id = uuid.uuid4()

    mock_rev = MagicMock(spec=DocumentRevision)
    mock_rev.revision_id = rev_id
    mock_rev.status = "EFFECTIVE"

    mock_db.query.return_value.filter.return_value.first.return_value = mock_rev
    app.dependency_overrides[get_db] = lambda: mock_db

    resp = client.delete(f"/api/v1/documents/revisions/{rev_id}")
    assert resp.status_code == 400
    assert "không được phép xóa bản sửa đổi" in resp.json().get("detail", "").lower()

def test_document_revision_draft_cannot_be_approved_directly(client: TestClient):
    """Test that DRAFT revisions must be submitted (UNDER_REVIEW) before approval."""
    from app.modules.auth.models import User
    from app.core.dependencies import get_current_user

    mock_db = MagicMock()
    user_id = uuid.uuid4()
    rev_id = uuid.uuid4()

    mock_user = MagicMock(spec=User)
    mock_user.user_id = user_id
    mock_user.role = "director"
    mock_user.roles = []
    mock_user.department = "Ban Giám Đốc"
    mock_user.is_active = True

    mock_rev = MagicMock(spec=DocumentRevision)
    mock_rev.revision_id = rev_id
    mock_rev.drafter_id = uuid.uuid4()  # Different user
    mock_rev.status = "DRAFT"  # Still DRAFT!

    mock_doc = MagicMock(spec=Document)
    mock_doc.document_id = uuid.uuid4()

    mock_db.query.return_value.filter.return_value.first.side_effect = [mock_rev, mock_doc]
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user

    resp = client.post(
        f"/api/v1/documents/revisions/{rev_id}/approve",
        json={"approval_notes": "Thử duyệt bản DRAFT"}
    )
    assert resp.status_code == 400
    assert "under_review" in resp.json().get("detail", "").lower()

def test_document_revision_cross_document_change_request_rejected(client: TestClient):
    """Test that linking a change request from another document is rejected."""
    from app.modules.documents.models import DocumentChangeRequest

    mock_db = MagicMock()
    doc_id = uuid.uuid4()
    other_doc_id = uuid.uuid4()
    cr_id = uuid.uuid4()

    mock_doc = MagicMock(spec=Document)
    mock_doc.document_id = doc_id
    mock_doc.doc_code = "QT-01"

    mock_cr = MagicMock(spec=DocumentChangeRequest)
    mock_cr.request_id = cr_id
    mock_cr.request_code = "YCSD-01"
    mock_cr.document_id = other_doc_id  # Belongs to a different document!
    mock_cr.status = "APPROVED"

    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_doc,
        None,  # No active draft
        None,  # No existing revision with same version
        mock_cr,
    ]
    app.dependency_overrides[get_db] = lambda: mock_db

    resp = client.post(
        f"/api/v1/documents/{doc_id}/revisions",
        json={
            "change_request_id": str(cr_id),
            "change_description": "Sửa quy trình theo phiếu khác",
            "drafter_name": "Kỹ sư QA"
        }
    )
    assert resp.status_code == 400
    assert "thuộc tài liệu khác" in resp.json().get("detail", "").lower()

def test_document_revision_content_sanitized():
    """Test that malicious HTML in DocumentRevisionCreate/Update content is sanitized."""
    rev_in = DocumentRevisionCreate.model_validate({
        "change_description": "Sửa đổi nội dung có chứa thẻ độc hại",
        "content": "<p>Nội dung hợp lệ</p><script>alert('XSS')</script><iframe src='javascript:void(0)'></iframe>",
        "drafter_name": "Kỹ sư QA"
    })
    assert "<script" not in (rev_in.content or "")
    assert "<iframe" not in (rev_in.content or "")
    assert "<p>Nội dung hợp lệ</p>" in (rev_in.content or "")
