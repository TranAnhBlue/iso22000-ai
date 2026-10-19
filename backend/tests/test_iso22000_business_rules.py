import pytest
from pydantic import ValidationError
from datetime import date
from app.modules.documents.schemas import RecordRetentionCreate, RecordRetentionUpdate
from app.modules.haccp.schemas import HACCPPlanCreate, ProcessStepCreate
from app.modules.purchasing.schemas import SupplierCreate

def test_retention_cannot_create_directly_as_disposed():
    """ISO 22000 BM01-KSHS: Creating a retention record directly as DISPOSED must be rejected."""
    with pytest.raises(ValidationError) as exc_info:
        RecordRetentionCreate(
            record_code="TEST-REC-001",
            record_name="Hồ sơ kiểm tra lưu mẫu",
            department="Ban QLCL & ATTP",
            storage_location="Kho hồ sơ",
            status="DISPOSED"
        )
    assert "Không được phép khởi tạo hồ sơ ở trạng thái DISPOSED" in str(exc_info.value)

def test_retention_cannot_update_directly_to_disposed():
    """Updating status directly to DISPOSED via general update schema must be rejected."""
    with pytest.raises(ValidationError) as exc_info:
        RecordRetentionUpdate(
            status="DISPOSED"
        )
    assert "Không thể chuyển trực tiếp sang trạng thái DISPOSED" in str(exc_info.value)

def test_retention_valid_create():
    """Valid retention record creation with RETAINED status should pass."""
    record = RecordRetentionCreate(
        record_code="BM01-KSHS-2026-01",
        record_name="Nhật ký giám sát CCP1",
        department="Ban QLCL & ATTP",
        storage_location="Kệ A2",
        status="RETAINED",
        creation_date=date.today(),
        retention_period="3 năm"
    )
    assert record.record_code == "BM01-KSHS-2026-01"
    assert record.status == "RETAINED"

def test_haccp_plan_validation():
    """HACCP plan must have valid code and name."""
    plan = HACCPPlanCreate(
        plan_code="HACCP-PLAN-2026-TOM",
        plan_name="Kế hoạch HACCP chế biến Tôm đông lạnh",
        product_line="Chế biến Tôm",
        team_leader="Trưởng ban HACCP / QA"
    )
    assert plan.plan_code == "HACCP-PLAN-2026-TOM"
    assert plan.status == "ACTIVE"

def test_haccp_process_step_number_must_be_positive():
    """Process step number must be at least 1."""
    with pytest.raises(ValidationError):
        ProcessStepCreate.model_validate({
            "step_number": 0,  # Invalid: ge=1 required
            "step_name": "Tiếp nhận nguyên liệu",
            "product_line": "Thủy hải sản",
        })

def test_purchasing_supplier_validation():
    """Supplier schema validation."""
    supplier = SupplierCreate(
        supplier_code="NCC-TOM-01",
        supplier_name="Công ty Cung ứng Tôm Sạch An Giang",
        category="Nguyên liệu tươi sống",
        rating_score=95.0,
        status="APPROVED"
    )
    assert supplier.status == "APPROVED"
    assert supplier.rating_score == 95.0
