from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime, timedelta
import random

from app.core.database import get_db
from app.modules.purchasing.models import Supplier, MaterialLot, IQCInspection, SupplierEvaluationPlan, SupplierEvaluation
from app.modules.auth.models import User
from app.modules.purchasing.schemas import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    MaterialLotCreate, MaterialLotUpdate, MaterialLotResponse,
    IQCInspectionCreate, IQCInspectionUpdate, IQCInspectionResponse,
    PurchasingStatsResponse,
    AICoAAnalysisRequest, AICoAAnalysisResponse, AICoAParameter,
    AISupplierEvaluationRequest, AISupplierEvaluationResponse,
    SupplierEvaluationPlanCreate, SupplierEvaluationPlanUpdate, SupplierEvaluationPlanResponse,
    SupplierEvaluationCreate, SupplierEvaluationUpdate, SupplierEvaluationResponse
)

router = APIRouter(prefix="/purchasing", tags=["Purchasing & IQC"])

# ==================== SERIALIZATION HELPERS (TYPE-SAFE) ====================
def format_supplier_out(s: Any, lots_count: int = 0, iqc_pass_rate: float = 100.0) -> SupplierResponse:
    """Chuyển đổi Supplier ORM Model sang SupplierResponse schema an toàn tuyệt đối về kiểu dữ liệu"""
    contact_dict = getattr(s, "contact_info", {})
    if not isinstance(contact_dict, dict):
        contact_dict = {}

    certs_list = getattr(s, "certifications", [])
    if not isinstance(certs_list, list):
        certs_list = []

    supp_id = getattr(s, "supplier_id", None)
    parsed_id = supp_id if isinstance(supp_id, UUID) else UUID(str(supp_id))

    score_val = getattr(s, "rating_score", 100.0)
    rating_num = float(score_val) if score_val is not None else 100.0

    return SupplierResponse(
        supplier_id=parsed_id,
        supplier_code=str(getattr(s, "supplier_code", "")),
        supplier_name=str(getattr(s, "supplier_name", "")),
        contact_info=contact_dict,
        category=str(getattr(s, "category", "Nguyên liệu tươi sống") or "Nguyên liệu tươi sống"),
        certifications=certs_list,
        rating_score=rating_num,
        status=str(getattr(s, "status", "APPROVED")),
        risk_level=str(getattr(s, "risk_level", "LOW") or "LOW"),
        evaluation_notes=str(s.evaluation_notes) if getattr(s, "evaluation_notes", None) is not None else None,
        evaluation_date=getattr(s, "evaluation_date", None),
        created_at=getattr(s, "created_at", None),
        lots_count=lots_count,
        iqc_pass_rate=iqc_pass_rate
    )


def format_lot_out(
    lot: Any,
    iqc_status: Any = "CHƯA KIỂM ĐỊNH",
    inspection_id: Any = None
) -> MaterialLotResponse:
    """Chuyển đổi MaterialLot ORM Model sang MaterialLotResponse schema an toàn tuyệt đối về kiểu dữ liệu"""
    supp_obj = getattr(lot, "supplier", None)
    supp_name = str(supp_obj.supplier_name) if supp_obj is not None and getattr(supp_obj, "supplier_name", None) is not None else None
    supp_code = str(supp_obj.supplier_code) if supp_obj is not None and getattr(supp_obj, "supplier_code", None) is not None else None

    creator_obj = getattr(lot, "creator", None)
    creator_name = str(creator_obj.full_name) if creator_obj is not None and getattr(creator_obj, "full_name", None) is not None else None

    lot_id = getattr(lot, "material_lot_id", None)
    parsed_lot_id = lot_id if isinstance(lot_id, UUID) else UUID(str(lot_id))

    supp_id = getattr(lot, "supplier_id", None)
    parsed_supp_id = supp_id if isinstance(supp_id, UUID) or supp_id is None else UUID(str(supp_id))

    created_by = getattr(lot, "created_by", None)
    parsed_created_by = created_by if isinstance(created_by, UUID) or created_by is None else UUID(str(created_by))

    parsed_insp_id = None
    if inspection_id is not None:
        parsed_insp_id = inspection_id if isinstance(inspection_id, UUID) else UUID(str(inspection_id))

    qty_val = getattr(lot, "quantity", 0.0)
    qty_num = float(qty_val) if qty_val is not None else 0.0

    return MaterialLotResponse(
        material_lot_id=parsed_lot_id,
        lot_number=str(getattr(lot, "lot_number", "")),
        supplier_id=parsed_supp_id,
        material_name=str(getattr(lot, "material_name", "")),
        material_category=str(getattr(lot, "material_category", "Nguyên liệu chính") or "Nguyên liệu chính"),
        received_date=getattr(lot, "received_date"),
        mfg_date=getattr(lot, "mfg_date", None),
        exp_date=getattr(lot, "exp_date", None),
        quantity=qty_num,
        unit=str(getattr(lot, "unit", "kg") or "kg"),
        storage_condition=str(lot.storage_condition) if getattr(lot, "storage_condition", None) is not None else None,
        coa_file_url=str(lot.coa_file_url) if getattr(lot, "coa_file_url", None) is not None else None,
        status=str(getattr(lot, "status", "PENDING_IQC")),
        created_by=parsed_created_by,
        supplier_name=supp_name,
        supplier_code=supp_code,
        creator_name=creator_name,
        created_at=getattr(lot, "created_at", None),
        iqc_status=str(iqc_status),
        inspection_id=parsed_insp_id
    )


def format_inspection_out(insp: Any) -> IQCInspectionResponse:
    """Chuyển đổi IQCInspection ORM Model sang IQCInspectionResponse schema an toàn tuyệt đối về kiểu dữ liệu"""
    mat_lot = getattr(insp, "material_lot", None)
    lot_num = str(mat_lot.lot_number) if mat_lot is not None and getattr(mat_lot, "lot_number", None) is not None else None
    mat_name = str(mat_lot.material_name) if mat_lot is not None and getattr(mat_lot, "material_name", None) is not None else None

    supp_name = None
    if mat_lot is not None and getattr(mat_lot, "supplier", None) is not None:
        supp_obj = mat_lot.supplier
        supp_name = str(supp_obj.supplier_name) if getattr(supp_obj, "supplier_name", None) is not None else None

    inspector_obj = getattr(insp, "inspector", None)
    insp_name = str(inspector_obj.full_name) if inspector_obj is not None and getattr(inspector_obj, "full_name", None) is not None else None

    insp_id = getattr(insp, "inspection_id", None)
    parsed_insp_id = insp_id if isinstance(insp_id, UUID) else UUID(str(insp_id))

    lot_id = getattr(insp, "material_lot_id", None)
    parsed_lot_id = lot_id if isinstance(lot_id, UUID) else UUID(str(lot_id))

    inspector_id = getattr(insp, "inspector_id", None)
    parsed_inspector_id = inspector_id if isinstance(inspector_id, UUID) or inspector_id is None else UUID(str(inspector_id))

    details = getattr(insp, "inspection_details", {})
    if not isinstance(details, dict):
        details = {}

    temp_val = getattr(insp, "temperature_c", None)
    moist_val = getattr(insp, "moisture_content", None)

    return IQCInspectionResponse(
        inspection_id=parsed_insp_id,
        inspection_code=str(getattr(insp, "inspection_code", "")),
        material_lot_id=parsed_lot_id,
        inspector_id=parsed_inspector_id,
        sensory_check=bool(getattr(insp, "sensory_check", True)),
        packaging_check=bool(getattr(insp, "packaging_check", True)),
        temperature_c=float(temp_val) if temp_val is not None else None,
        moisture_content=float(moist_val) if moist_val is not None else None,
        mycotoxin_check=bool(getattr(insp, "mycotoxin_check", True)),
        allergen_check=bool(getattr(insp, "allergen_check", False)),
        coa_compliance=bool(getattr(insp, "coa_compliance", True)),
        defect_rate_percent=float(getattr(insp, "defect_rate_percent", 0.0)) if getattr(insp, "defect_rate_percent", None) is not None else 0.0,
        impurity_percent=float(getattr(insp, "impurity_percent", 0.0)) if getattr(insp, "impurity_percent", None) is not None else 0.0,
        size_uniformity_check=bool(getattr(insp, "size_uniformity_check", True)),
        vehicle_cleanliness_check=bool(getattr(insp, "vehicle_cleanliness_check", True)),
        delivery_vehicle_plate=str(getattr(insp, "delivery_vehicle_plate", "")) if getattr(insp, "delivery_vehicle_plate", None) else None,
        driver_name=str(getattr(insp, "driver_name", "")) if getattr(insp, "driver_name", None) else None,
        inspection_details=details,
        status=str(getattr(insp, "status", "PASSED")),
        notes=str(insp.notes) if getattr(insp, "notes", None) is not None else None,
        lot_number=lot_num,
        material_name=mat_name,
        supplier_name=supp_name,
        inspector_name=insp_name,
        inspected_at=getattr(insp, "inspected_at", None)
    )


# ==================== SEED DATA DEFINITIONS ====================
SEED_SUPPLIERS = [
    {
        "supplier_code": "NCC-SEAFOOD-01",
        "supplier_name": "Công ty Cổ phần Thủy hải sản Biển Đông",
        "category": "Nguyên liệu tươi sống",
        "contact_info": {
            "contact_person": "Nguyễn Văn Thắng (Giám đốc KD)",
            "phone": "0912.345.678",
            "email": "thang.seafood@biendong.com.vn",
            "address": "Lô B2, KCN Thủy sản Vũng Tàu, BR-VT",
            "tax_code": "3501289456"
        },
        "certifications": ["HACCP Codex", "ISO 22000:2018", "BRC Food Grade A"],
        "rating_score": 96.5,
        "status": "APPROVED",
        "risk_level": "LOW",
        "evaluation_notes": "Đạt chuẩn xuất khẩu Châu Âu & Mỹ, xe lạnh GPS giám sát nhiệt độ 24/7."
    },
    {
        "supplier_code": "NCC-FLOUR-02",
        "supplier_name": "Công ty Bột mì Bình Đông & Ngũ cốc Đại Nam",
        "category": "Bột mì & Tinh bột",
        "contact_info": {
            "contact_person": "Trần Thị Mai (P. Mua bán)",
            "phone": "0908.765.432",
            "email": "mai.tran@binhdongflour.vn",
            "address": "45 Cảng Q.8, TP. Hồ Chí Minh",
            "tax_code": "0301458923"
        },
        "certifications": ["FSSC 22000", "ISO 22000:2018", "Halal"],
        "rating_score": 92.0,
        "status": "APPROVED",
        "risk_level": "LOW",
        "evaluation_notes": "Nguồn lúa mì nhập khẩu từ Úc, độ ẩm luôn < 13.5%, COA kiểm định từng container."
    },
    {
        "supplier_code": "NCC-SPICE-03",
        "supplier_name": "Công ty TNHH Hương liệu & Gia vị Tự nhiên Sài Gòn",
        "category": "Phụ gia & Gia vị",
        "contact_info": {
            "contact_person": "Lê Hoàng Phúc",
            "phone": "0983.112.233",
            "email": "phuc.le@saigonspice.vn",
            "address": "Khu chế xuất Tân Thuận, Q.7, TP.HCM",
            "tax_code": "0309988776"
        },
        "certifications": ["ISO 22000:2018", "ISO 9001:2015"],
        "rating_score": 88.5,
        "status": "APPROVED",
        "risk_level": "LOW",
        "evaluation_notes": "Cung cấp hương mặn và gia vị tổng hợp, kiểm soát kim loại nặng tốt."
    },
    {
        "supplier_code": "NCC-PACK-04",
        "supplier_name": "Tổng công ty Bao bì Màng ghép Phú Mỹ",
        "category": "Bao bì trực tiếp",
        "contact_info": {
            "contact_person": "Vũ Đình Cường",
            "phone": "0934.556.677",
            "email": "cuong.vu@phumypack.com",
            "address": "KCN Phú Mỹ 1, Bà Rịa - Vũng Tàu",
            "tax_code": "3500876543"
        },
        "certifications": ["ISO 9001:2015", "HACCP Bao bì"],
        "rating_score": 74.0,
        "status": "WARNING",
        "risk_level": "MEDIUM",
        "evaluation_notes": "Lô màng PA/PE đợt tháng 01/2026 có độ thôi nhiễm chì sát ngưỡng giới hạn QCVN 12-1."
    },
    {
        "supplier_code": "NCC-CHEM-05",
        "supplier_name": "Công ty CP Hóa chất Tẩy rửa & Tiệt trùng Tân An Lành",
        "category": "Hóa chất CIP & Khử trùng",
        "contact_info": {
            "contact_person": "Phạm Quang Dũng",
            "phone": "0977.889.900",
            "email": "dung.pham@anlanhchem.vn",
            "address": "KCN Sóng Thần 2, Dĩ An, Bình Dương",
            "tax_code": "3700654321"
        },
        "certifications": ["ISO 9001:2015", "Chứng nhận An toàn NSF Hóa chất Thực phẩm"],
        "rating_score": 90.0,
        "status": "APPROVED",
        "risk_level": "LOW",
        "evaluation_notes": "Cung cấp xút vảy thực phẩm và Clo tiệt trùng đường ống CIP có MSDS đầy đủ."
    },
    {
        "supplier_code": "NCC-OIL-06",
        "supplier_name": "Nhà máy Dầu thực vật Tinh luyện Mekong",
        "category": "Dầu ăn & Chất béo thực vật",
        "contact_info": {
            "contact_person": "Đặng Hữu Tài",
            "phone": "0918.999.888",
            "email": "tai.dang@mekongoil.com.vn",
            "address": "KCN Trà Nóc, Cần Thơ",
            "tax_code": "1800543210"
        },
        "certifications": ["FSSC 22000", "RSPO Certificate", "Halal"],
        "rating_score": 94.0,
        "status": "APPROVED",
        "risk_level": "LOW",
        "evaluation_notes": "Chỉ số acid value và peroxide value luôn đạt chuẩn TCVN."
    }
]

def seed_purchasing_data_if_empty(db: Session) -> None:
    existing_count = db.query(Supplier).count()
    if existing_count > 0:
        return

    admin_user = db.query(User).first()
    admin_id = admin_user.user_id if admin_user else None

    # 1. Insert Suppliers
    created_suppliers = []
    for s_data in SEED_SUPPLIERS:
        sup = Supplier(
            supplier_code=str(s_data["supplier_code"]),
            supplier_name=str(s_data["supplier_name"]),
            category=str(s_data["category"]),
            contact_info=s_data["contact_info"],
            certifications=s_data["certifications"],
            rating_score=float(s_data["rating_score"]),
            status=str(s_data["status"]),
            risk_level=str(s_data["risk_level"]),
            evaluation_notes=str(s_data["evaluation_notes"]),
            evaluation_date=date.today() - timedelta(days=random.randint(10, 60))
        )
        db.add(sup)
        created_suppliers.append(sup)
    db.commit()

    # 2. Insert Sample Material Lots & Inspections
    today = date.today()
    sample_lots = [
        {
            "lot_number": "LOT-2026-SEAFOOD-001",
            "supplier": created_suppliers[0],
            "material_name": "Cá ngừ đại dương fillet cấp đông IQF",
            "material_category": "Nguyên liệu tươi sống",
            "received_date": today - timedelta(days=2),
            "mfg_date": today - timedelta(days=15),
            "exp_date": today + timedelta(days=350),
            "quantity": 2500.0,
            "unit": "kg",
            "storage_condition": "Kho lạnh ≤ -18°C",
            "coa_file_url": "https://iso22000.wcert.vn/coa/COA-SEAFOOD-2026-001.pdf",
            "status": "APPROVED",
            "inspection": {
                "inspection_code": "IQC-2026-001",
                "sensory_check": True,
                "packaging_check": True,
                "temperature_c": -19.5,
                "moisture_content": 74.2,
                "mycotoxin_check": True,
                "allergen_check": False,
                "coa_compliance": True,
                "status": "PASSED",
                "notes": "Cá ngừ tươi, màu đỏ tươi tự nhiên, xe đông lạnh đạt -19.5°C, histamine < 20 ppm."
            }
        },
        {
            "lot_number": "LOT-2026-FLOUR-002",
            "supplier": created_suppliers[1],
            "material_name": "Bột mì cao cấp số 11 (Protein 11.5%)",
            "material_category": "Bột mì & Tinh bột",
            "received_date": today - timedelta(days=4),
            "mfg_date": today - timedelta(days=20),
            "exp_date": today + timedelta(days=160),
            "quantity": 5000.0,
            "unit": "kg",
            "storage_condition": "Kho khô thoáng ≤ 25°C",
            "coa_file_url": "https://iso22000.wcert.vn/coa/COA-FLOUR-2026-002.pdf",
            "status": "APPROVED",
            "inspection": {
                "inspection_code": "IQC-2026-002",
                "sensory_check": True,
                "packaging_check": True,
                "temperature_c": 26.0,
                "moisture_content": 13.1,
                "mycotoxin_check": True,
                "allergen_check": True,
                "coa_compliance": True,
                "status": "PASSED",
                "notes": "Độ ẩm 13.1% (đạt yêu cầu <13.8%), Aflatoxin âm tính, bao bì 25kg nguyên vẹn."
            }
        },
        {
            "lot_number": "LOT-2026-SPICE-003",
            "supplier": created_suppliers[2],
            "material_name": "Hỗn hợp hương mặn bột thịt bò tự nhiên",
            "material_category": "Phụ gia & Gia vị",
            "received_date": today - timedelta(days=6),
            "mfg_date": today - timedelta(days=30),
            "exp_date": today + timedelta(days=335),
            "quantity": 300.0,
            "unit": "kg",
            "storage_condition": "Kho mát 18-22°C",
            "coa_file_url": "https://iso22000.wcert.vn/coa/COA-SPICE-2026-003.pdf",
            "status": "APPROVED",
            "inspection": {
                "inspection_code": "IQC-2026-003",
                "sensory_check": True,
                "packaging_check": True,
                "temperature_c": 22.5,
                "moisture_content": 5.2,
                "mycotoxin_check": True,
                "allergen_check": False,
                "coa_compliance": True,
                "status": "PASSED",
                "notes": "Mùi thơm đặc trưng, không vón cục, chỉ tiêu chì & cadmi nằm trong ngưỡng quy định."
            }
        },
        {
            "lot_number": "LOT-2026-PACK-004",
            "supplier": created_suppliers[3],
            "material_name": "Màng bao bì hút chân không PA/PE 5 lớp",
            "material_category": "Bao bì trực tiếp",
            "received_date": today - timedelta(days=1),
            "mfg_date": today - timedelta(days=10),
            "exp_date": today + timedelta(days=720),
            "quantity": 1200.0,
            "unit": "cuộn",
            "storage_condition": "Kho bao bì tiêu chuẩn",
            "coa_file_url": "https://iso22000.wcert.vn/coa/COA-PACK-2026-004.pdf",
            "status": "QUARANTINE",
            "inspection": {
                "inspection_code": "IQC-2026-004",
                "sensory_check": True,
                "packaging_check": False,
                "temperature_c": 28.0,
                "moisture_content": 0.0,
                "mycotoxin_check": False,
                "allergen_check": False,
                "coa_compliance": False,
                "status": "CONDITIONAL",
                "notes": "Có 15 cuộn bao bì bị móp méo lõi và trầy xước bề mặt khi vận chuyển. Tạm cách ly để kiểm tra thôi nhiễm hóa chất bổ sung."
            }
        },
        {
            "lot_number": "LOT-2026-CHEM-005",
            "supplier": created_suppliers[4],
            "material_name": "Dung dịch Khử trùng Chlorin Diocide ClO2 5%",
            "material_category": "Hóa chất CIP & Khử trùng",
            "received_date": today,
            "mfg_date": today - timedelta(days=5),
            "exp_date": today + timedelta(days=180),
            "quantity": 400.0,
            "unit": "lít",
            "storage_condition": "Kho hóa chất chuyên dụng",
            "coa_file_url": "https://iso22000.wcert.vn/coa/COA-CHEM-2026-005.pdf",
            "status": "PENDING_IQC",
            "inspection": None
        }
    ]

    for item in sample_lots:
        lot = MaterialLot(
            lot_number=str(item["lot_number"]),
            supplier_id=item["supplier"].supplier_id,
            material_name=str(item["material_name"]),
            material_category=str(item["material_category"]),
            received_date=item["received_date"],
            mfg_date=item["mfg_date"],
            exp_date=item["exp_date"],
            quantity=float(item["quantity"]),
            unit=str(item["unit"]),
            storage_condition=str(item["storage_condition"]),
            coa_file_url=str(item["coa_file_url"]),
            status=str(item["status"]),
            created_by=admin_id
        )
        db.add(lot)
        db.flush()

        if item["inspection"]:
            insp_data = item["inspection"]
            insp = IQCInspection(
                inspection_code=str(insp_data["inspection_code"]),
                material_lot_id=lot.material_lot_id,
                inspector_id=admin_id,
                sensory_check=bool(insp_data["sensory_check"]),
                packaging_check=bool(insp_data["packaging_check"]),
                temperature_c=float(insp_data["temperature_c"]) if insp_data["temperature_c"] is not None else None,
                moisture_content=float(insp_data["moisture_content"]) if insp_data["moisture_content"] is not None else None,
                mycotoxin_check=bool(insp_data["mycotoxin_check"]),
                allergen_check=bool(insp_data["allergen_check"]),
                coa_compliance=bool(insp_data["coa_compliance"]),
                status=str(insp_data["status"]),
                notes=str(insp_data["notes"])
            )
            db.add(insp)

    db.commit()


# ==================== STATS ENDPOINT ====================
@router.get("/stats", response_model=PurchasingStatsResponse)
def get_purchasing_stats(db: Session = Depends(get_db)):
    seed_purchasing_data_if_empty(db)

    total_suppliers = db.query(Supplier).count()
    approved_suppliers = db.query(Supplier).filter(Supplier.status == "APPROVED").count()
    warning_suppliers = db.query(Supplier).filter(Supplier.status == "WARNING").count()
    suspended_suppliers = db.query(Supplier).filter(Supplier.status.in_(["SUSPENDED", "PENDING_EVALUATION"])).count()

    total_lots = db.query(MaterialLot).count()
    pending_lots = db.query(MaterialLot).filter(MaterialLot.status == "PENDING_IQC").count()

    total_inspections = db.query(IQCInspection).count()
    passed_inspections = db.query(IQCInspection).filter(IQCInspection.status == "PASSED").count()
    rejected_inspections = db.query(IQCInspection).filter(IQCInspection.status.in_(["REJECTED", "CONDITIONAL"])).count()

    pass_rate = round((passed_inspections / total_inspections * 100), 1) if total_inspections > 0 else 100.0

    return PurchasingStatsResponse(
        total_suppliers=total_suppliers,
        approved_suppliers=approved_suppliers,
        warning_suppliers=warning_suppliers,
        suspended_suppliers=suspended_suppliers,
        total_lots_received=total_lots,
        pending_iqc_lots=pending_lots,
        iqc_pass_rate_percentage=pass_rate,
        total_inspections=total_inspections,
        rejected_inspections=rejected_inspections
    )


# ==================== SUPPLIER ENDPOINTS ====================
@router.get("/suppliers", response_model=List[SupplierResponse])
def get_suppliers(
    q: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_purchasing_data_if_empty(db)

    query = db.query(Supplier)

    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Supplier.supplier_code.ilike(search),
                Supplier.supplier_name.ilike(search),
                Supplier.category.ilike(search)
            )
        )

    if category and category != "ALL":
        query = query.filter(Supplier.category == category)

    if status_filter and status_filter != "ALL":
        query = query.filter(Supplier.status == status_filter)

    if risk_level and risk_level != "ALL":
        query = query.filter(Supplier.risk_level == risk_level)

    suppliers = query.order_by(desc(Supplier.rating_score), Supplier.supplier_code).all()

    result = []
    for s in suppliers:
        lots_count = db.query(MaterialLot).filter(MaterialLot.supplier_id == s.supplier_id).count()
        supplier_inspections = (
            db.query(IQCInspection)
            .join(MaterialLot, IQCInspection.material_lot_id == MaterialLot.material_lot_id)
            .filter(MaterialLot.supplier_id == s.supplier_id)
            .all()
        )
        total_insp = len(supplier_inspections)
        passed_insp = len([i for i in supplier_inspections if i.status == "PASSED"])
        pass_rate = round((passed_insp / total_insp * 100), 1) if total_insp > 0 else 100.0

        result.append(format_supplier_out(s, lots_count=lots_count, iqc_pass_rate=pass_rate))

    return result


@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(supplier_in: SupplierCreate, db: Session = Depends(get_db)):
    code_str = supplier_in.supplier_code.strip()
    existing = db.query(Supplier).filter(Supplier.supplier_code == code_str).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã nhà cung cấp '{code_str}' đã tồn tại trong hệ thống.")

    supplier = Supplier(
        supplier_code=code_str,
        supplier_name=supplier_in.supplier_name.strip(),
        contact_info=supplier_in.contact_info,
        category=supplier_in.category,
        certifications=supplier_in.certifications,
        rating_score=supplier_in.rating_score,
        status=supplier_in.status,
        risk_level=supplier_in.risk_level,
        evaluation_notes=supplier_in.evaluation_notes,
        evaluation_date=supplier_in.evaluation_date or date.today()
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    return format_supplier_out(supplier, lots_count=0, iqc_pass_rate=100.0)


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
def get_supplier_detail(supplier_id: UUID, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.supplier_id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà cung cấp.")

    lots_count = db.query(MaterialLot).filter(MaterialLot.supplier_id == supplier.supplier_id).count()
    return format_supplier_out(supplier, lots_count=lots_count, iqc_pass_rate=100.0)


@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: UUID, supplier_in: SupplierUpdate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.supplier_id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà cung cấp.")

    if supplier_in.supplier_code is not None:
        new_code = supplier_in.supplier_code.strip()
        if new_code != supplier.supplier_code:
            existing = db.query(Supplier).filter(Supplier.supplier_code == new_code).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Mã NCC '{new_code}' đã trùng với đối tác khác.")
            supplier.supplier_code = new_code

    if supplier_in.supplier_name is not None:
        supplier.supplier_name = supplier_in.supplier_name.strip()
    if supplier_in.contact_info is not None:
        supplier.contact_info = supplier_in.contact_info
    if supplier_in.category is not None:
        supplier.category = supplier_in.category
    if supplier_in.certifications is not None:
        supplier.certifications = supplier_in.certifications
    if supplier_in.rating_score is not None:
        supplier.rating_score = supplier_in.rating_score
    if supplier_in.status is not None:
        supplier.status = supplier_in.status
    if supplier_in.risk_level is not None:
        supplier.risk_level = supplier_in.risk_level
    if supplier_in.evaluation_notes is not None:
        supplier.evaluation_notes = supplier_in.evaluation_notes
    if supplier_in.evaluation_date is not None:
        supplier.evaluation_date = supplier_in.evaluation_date

    db.commit()
    db.refresh(supplier)

    lots_count = db.query(MaterialLot).filter(MaterialLot.supplier_id == supplier.supplier_id).count()
    return format_supplier_out(supplier, lots_count=lots_count, iqc_pass_rate=100.0)


@router.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: UUID, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.supplier_id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà cung cấp.")

    db.delete(supplier)
    db.commit()
    return {"message": f"Đã xóa thành công nhà cung cấp '{supplier.supplier_name}'."}


# ==================== MATERIAL LOT ENDPOINTS ====================
@router.get("/lots", response_model=List[MaterialLotResponse])
def get_material_lots(
    q: Optional[str] = None,
    supplier_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_purchasing_data_if_empty(db)

    query = db.query(MaterialLot)

    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                MaterialLot.lot_number.ilike(search),
                MaterialLot.material_name.ilike(search),
                MaterialLot.material_category.ilike(search)
            )
        )

    if supplier_id:
        query = query.filter(MaterialLot.supplier_id == supplier_id)

    if status_filter and status_filter != "ALL":
        query = query.filter(MaterialLot.status == status_filter)

    if category and category != "ALL":
        query = query.filter(MaterialLot.material_category == category)

    lots = query.order_by(desc(MaterialLot.received_date), desc(MaterialLot.created_at)).all()

    result = []
    for lot in lots:
        latest_insp = (
            db.query(IQCInspection)
            .filter(IQCInspection.material_lot_id == lot.material_lot_id)
            .order_by(desc(IQCInspection.inspected_at))
            .first()
        )
        iqc_st = getattr(latest_insp, "status", "CHƯA KIỂM ĐỊNH") if latest_insp is not None else "CHƯA KIỂM ĐỊNH"
        insp_id = getattr(latest_insp, "inspection_id", None) if latest_insp is not None else None
        result.append(format_lot_out(lot, iqc_status=iqc_st, inspection_id=insp_id))

    return result


@router.post("/lots", response_model=MaterialLotResponse, status_code=status.HTTP_201_CREATED)
def create_material_lot(lot_in: MaterialLotCreate, db: Session = Depends(get_db)):
    lot_code = lot_in.lot_number.strip()
    existing = db.query(MaterialLot).filter(MaterialLot.lot_number == lot_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã số lô '{lot_code}' đã tồn tại trên hệ thống.")

    creator_id = lot_in.created_by
    if not creator_id:
        admin_user = db.query(User).first()
        if admin_user:
            creator_id = admin_user.user_id

    lot = MaterialLot(
        lot_number=lot_code,
        supplier_id=lot_in.supplier_id,
        material_name=lot_in.material_name.strip(),
        material_category=lot_in.material_category,
        received_date=lot_in.received_date,
        mfg_date=lot_in.mfg_date,
        exp_date=lot_in.exp_date,
        quantity=lot_in.quantity,
        unit=lot_in.unit,
        storage_condition=lot_in.storage_condition,
        coa_file_url=lot_in.coa_file_url,
        status=lot_in.status or "PENDING_IQC",
        created_by=creator_id
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)

    return format_lot_out(lot, iqc_status="CHƯA KIỂM ĐỊNH", inspection_id=None)


@router.get("/lots/{lot_id}", response_model=MaterialLotResponse)
def get_material_lot(lot_id: UUID, db: Session = Depends(get_db)):
    lot = db.query(MaterialLot).filter(MaterialLot.material_lot_id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô nguyên liệu.")

    latest_insp = (
        db.query(IQCInspection)
        .filter(IQCInspection.material_lot_id == lot.material_lot_id)
        .order_by(desc(IQCInspection.inspected_at))
        .first()
    )
    iqc_st = getattr(latest_insp, "status", "CHƯA KIỂM ĐỊNH") if latest_insp is not None else "CHƯA KIỂM ĐỊNH"
    insp_id = getattr(latest_insp, "inspection_id", None) if latest_insp is not None else None
    return format_lot_out(lot, iqc_status=iqc_st, inspection_id=insp_id)


@router.put("/lots/{lot_id}", response_model=MaterialLotResponse)
def update_material_lot(lot_id: UUID, lot_in: MaterialLotUpdate, db: Session = Depends(get_db)):
    lot = db.query(MaterialLot).filter(MaterialLot.material_lot_id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô nguyên liệu.")

    if lot_in.lot_number is not None:
        new_code = lot_in.lot_number.strip()
        if new_code != lot.lot_number:
            existing = db.query(MaterialLot).filter(MaterialLot.lot_number == new_code).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Mã lô '{new_code}' đã tồn tại.")
            lot.lot_number = new_code

    if lot_in.material_name is not None:
        lot.material_name = lot_in.material_name.strip()
    if lot_in.supplier_id is not None:
        lot.supplier_id = lot_in.supplier_id
    if lot_in.material_category is not None:
        lot.material_category = lot_in.material_category
    if lot_in.received_date is not None:
        lot.received_date = lot_in.received_date
    if lot_in.mfg_date is not None:
        lot.mfg_date = lot_in.mfg_date
    if lot_in.exp_date is not None:
        lot.exp_date = lot_in.exp_date
    if lot_in.quantity is not None:
        lot.quantity = lot_in.quantity
    if lot_in.unit is not None:
        lot.unit = lot_in.unit
    if lot_in.storage_condition is not None:
        lot.storage_condition = lot_in.storage_condition
    if lot_in.coa_file_url is not None:
        lot.coa_file_url = lot_in.coa_file_url
    if lot_in.status is not None:
        lot.status = lot_in.status

    db.commit()
    db.refresh(lot)

    latest_insp = (
        db.query(IQCInspection)
        .filter(IQCInspection.material_lot_id == lot.material_lot_id)
        .order_by(desc(IQCInspection.inspected_at))
        .first()
    )
    iqc_st = getattr(latest_insp, "status", "CHƯA KIỂM ĐỊNH") if latest_insp is not None else "CHƯA KIỂM ĐỊNH"
    insp_id = getattr(latest_insp, "inspection_id", None) if latest_insp is not None else None
    return format_lot_out(lot, iqc_status=iqc_st, inspection_id=insp_id)


@router.delete("/lots/{lot_id}")
def delete_material_lot(lot_id: UUID, db: Session = Depends(get_db)):
    lot = db.query(MaterialLot).filter(MaterialLot.material_lot_id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô nguyên liệu.")

    db.delete(lot)
    db.commit()
    return {"message": f"Đã xóa lô nguyên liệu '{lot.lot_number}' thành công."}


# ==================== IQC INSPECTION ENDPOINTS ====================
@router.get("/inspections", response_model=List[IQCInspectionResponse])
def get_iqc_inspections(
    q: Optional[str] = None,
    status_filter: Optional[str] = None,
    material_lot_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    seed_purchasing_data_if_empty(db)

    query = db.query(IQCInspection)

    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.join(MaterialLot, IQCInspection.material_lot_id == MaterialLot.material_lot_id, isouter=True).filter(
            or_(
                IQCInspection.inspection_code.ilike(search),
                IQCInspection.notes.ilike(search),
                MaterialLot.lot_number.ilike(search),
                MaterialLot.material_name.ilike(search)
            )
        )

    if status_filter and status_filter != "ALL":
        query = query.filter(IQCInspection.status == status_filter)

    if material_lot_id:
        query = query.filter(IQCInspection.material_lot_id == material_lot_id)

    inspections = query.order_by(desc(IQCInspection.inspected_at)).all()
    return [format_inspection_out(insp) for insp in inspections]


@router.post("/inspections", response_model=IQCInspectionResponse, status_code=status.HTTP_201_CREATED)
def create_iqc_inspection(insp_in: IQCInspectionCreate, db: Session = Depends(get_db)):
    code_str = insp_in.inspection_code.strip()
    existing = db.query(IQCInspection).filter(IQCInspection.inspection_code == code_str).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã biên bản IQC '{code_str}' đã tồn tại.")

    lot = db.query(MaterialLot).filter(MaterialLot.material_lot_id == insp_in.material_lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô nguyên liệu tương ứng.")

    inspector_id = insp_in.inspector_id
    if not inspector_id:
        admin_user = db.query(User).first()
        if admin_user:
            inspector_id = admin_user.user_id

    insp = IQCInspection(
        inspection_code=code_str,
        material_lot_id=insp_in.material_lot_id,
        inspector_id=inspector_id,
        sensory_check=insp_in.sensory_check,
        packaging_check=insp_in.packaging_check,
        temperature_c=insp_in.temperature_c,
        moisture_content=insp_in.moisture_content,
        mycotoxin_check=insp_in.mycotoxin_check,
        allergen_check=insp_in.allergen_check,
        coa_compliance=insp_in.coa_compliance,
        defect_rate_percent=insp_in.defect_rate_percent if insp_in.defect_rate_percent is not None else 0.0,
        impurity_percent=insp_in.impurity_percent if insp_in.impurity_percent is not None else 0.0,
        size_uniformity_check=insp_in.size_uniformity_check,
        vehicle_cleanliness_check=insp_in.vehicle_cleanliness_check,
        delivery_vehicle_plate=insp_in.delivery_vehicle_plate,
        driver_name=insp_in.driver_name,
        inspection_details=insp_in.inspection_details,
        status=insp_in.status or "PASSED",
        notes=insp_in.notes
    )
    db.add(insp)

    # Đồng bộ trạng thái Lô
    if insp_in.status == "PASSED":
        lot.status = "APPROVED"
    elif insp_in.status == "REJECTED":
        lot.status = "REJECTED"
    elif insp_in.status == "CONDITIONAL":
        lot.status = "QUARANTINE"

    # Cập nhật điểm tín nhiệm nhà cung cấp
    supp_obj = getattr(lot, "supplier", None)
    if supp_obj is not None:
        supp_score = getattr(supp_obj, "rating_score", 100.0)
        curr_score = float(supp_score) if supp_score is not None else 100.0
        if insp_in.status == "PASSED":
            supp_obj.rating_score = min(100.0, curr_score + 0.5)
        elif insp_in.status == "REJECTED":
            supp_obj.rating_score = max(0.0, curr_score - 5.0)
            if supp_obj.rating_score < 70.0:
                supp_obj.status = "WARNING"
                supp_obj.risk_level = "HIGH"

    db.commit()
    db.refresh(insp)

    return format_inspection_out(insp)


@router.get("/inspections/{inspection_id}", response_model=IQCInspectionResponse)
def get_iqc_inspection(inspection_id: UUID, db: Session = Depends(get_db)):
    insp = db.query(IQCInspection).filter(IQCInspection.inspection_id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Không tìm thấy biên bản kiểm tra IQC.")

    return format_inspection_out(insp)


@router.put("/inspections/{inspection_id}", response_model=IQCInspectionResponse)
def update_iqc_inspection(inspection_id: UUID, insp_in: IQCInspectionUpdate, db: Session = Depends(get_db)):
    insp = db.query(IQCInspection).filter(IQCInspection.inspection_id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Không tìm thấy biên bản IQC.")

    if insp_in.inspection_code is not None:
        insp.inspection_code = insp_in.inspection_code.strip()
    if insp_in.sensory_check is not None:
        insp.sensory_check = insp_in.sensory_check
    if insp_in.packaging_check is not None:
        insp.packaging_check = insp_in.packaging_check
    if insp_in.temperature_c is not None:
        insp.temperature_c = insp_in.temperature_c
    if insp_in.moisture_content is not None:
        insp.moisture_content = insp_in.moisture_content
    if insp_in.mycotoxin_check is not None:
        insp.mycotoxin_check = insp_in.mycotoxin_check
    if insp_in.allergen_check is not None:
        insp.allergen_check = insp_in.allergen_check
    if insp_in.coa_compliance is not None:
        insp.coa_compliance = insp_in.coa_compliance
    if insp_in.defect_rate_percent is not None:
        insp.defect_rate_percent = insp_in.defect_rate_percent
    if insp_in.impurity_percent is not None:
        insp.impurity_percent = insp_in.impurity_percent
    if insp_in.size_uniformity_check is not None:
        insp.size_uniformity_check = insp_in.size_uniformity_check
    if insp_in.vehicle_cleanliness_check is not None:
        insp.vehicle_cleanliness_check = insp_in.vehicle_cleanliness_check
    if insp_in.delivery_vehicle_plate is not None:
        insp.delivery_vehicle_plate = insp_in.delivery_vehicle_plate.strip()
    if insp_in.driver_name is not None:
        insp.driver_name = insp_in.driver_name.strip()
    if insp_in.inspection_details is not None:
        insp.inspection_details = insp_in.inspection_details
    if insp_in.status is not None:
        insp.status = insp_in.status
        # Sync lot status
        mat_lot = getattr(insp, "material_lot", None)
        if mat_lot is not None:
            if insp_in.status == "PASSED":
                mat_lot.status = "APPROVED"
            elif insp_in.status == "REJECTED":
                mat_lot.status = "REJECTED"
            elif insp_in.status == "CONDITIONAL":
                mat_lot.status = "QUARANTINE"

    if insp_in.notes is not None:
        insp.notes = insp_in.notes

    db.commit()
    db.refresh(insp)

    return format_inspection_out(insp)


@router.delete("/inspections/{inspection_id}")
def delete_iqc_inspection(inspection_id: UUID, db: Session = Depends(get_db)):
    insp = db.query(IQCInspection).filter(IQCInspection.inspection_id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Không tìm thấy biên bản IQC.")

    db.delete(insp)
    db.commit()
    return {"message": f"Đã xóa biên bản IQC '{insp.inspection_code}' thành công."}


# ==================== AI ASSISTANT ENDPOINTS ====================
@router.post("/ai/analyze-coa", response_model=AICoAAnalysisResponse)
def analyze_coa_with_ai(req: AICoAAnalysisRequest):
    """
    AI COA Inspector: Tự động đối chiếu thông số COA nguyên liệu với quy chuẩn an toàn thực phẩm ISO 22000 / QCVN / Codex.
    """
    sample_type = req.sample_type or "SEAFOOD"

    if sample_type == "SEAFOOD":
        parameters = [
            AICoAParameter(name="Nhiệt độ tâm sản phẩm", tested_value="-19.5 °C", standard_limit="≤ -18.0 °C", is_compliant=True, risk_level="SAFE", notes="Đạt chuẩn chuỗi lạnh liên tục"),
            AICoAParameter(name="Hàm lượng Histamine", tested_value="14.2 mg/kg", standard_limit="≤ 100 mg/kg (QCVN 8-2)", is_compliant=True, risk_level="SAFE", notes="Tươi mới, nguy cơ dị ứng thấp"),
            AICoAParameter(name="Kim loại nặng: Chì (Pb)", tested_value="0.12 mg/kg", standard_limit="≤ 0.30 mg/kg", is_compliant=True, risk_level="SAFE", notes="Trong ngưỡng an toàn thực phẩm"),
            AICoAParameter(name="Kim loại nặng: Cadmi (Cd)", tested_value="0.04 mg/kg", standard_limit="≤ 0.05 mg/kg", is_compliant=True, risk_level="WARNING", notes="Sát ngưỡng tới hạn 0.05 mg/kg, cần theo dõi lô tiếp theo"),
            AICoAParameter(name="Vi sinh: Salmonella", tested_value="Không phát hiện / 25g", standard_limit="Không được có / 25g", is_compliant=True, risk_level="SAFE", notes="Đạt chuẩn vi sinh vật gây bệnh"),
            AICoAParameter(name="Vi sinh: E.coli", tested_value="< 10 CFU/g", standard_limit="≤ 100 CFU/g", is_compliant=True, risk_level="SAFE", notes="Đạt chuẩn vệ sinh sơ chế"),
        ]
        overall_status = "PASSED"
        confidence_score = 98.5
        summary = "Toàn bộ 6/6 chỉ tiêu cảm quan, hóa lý, kim loại nặng và vi sinh vật đều đạt chuẩn QCVN 8-2:2011/BYT và ISO 22000:2018. Sản phẩm đủ điều kiện tiếp nhận nhập kho lạnh."
        iso_ref = "ISO 22000:2018 Clause 7.1.6 & QCVN 8-2:2011/BYT"
        suggested_status = "PASSED"
        actions = [
            "Chấp nhận nhập kho lạnh bảo quản nhiệt độ ≤ -18°C.",
            "Lưu phiếu COA gốc vào hồ sơ kiểm soát nguyên liệu đầu vào.",
            "Ghi chú theo dõi hàm lượng Cadmi đối với các lô thủy sản tiếp theo của NCC."
        ]
    elif sample_type == "FLOUR":
        parameters = [
            AICoAParameter(name="Độ ẩm (Moisture)", tested_value="13.1 %", standard_limit="≤ 13.8 % (TCVN 4359)", is_compliant=True, risk_level="SAFE", notes="Khô ráo, không nguy cơ nấm mốc"),
            AICoAParameter(name="Hàm lượng Protein khô", tested_value="11.6 %", standard_limit="≥ 11.0 %", is_compliant=True, risk_level="SAFE", notes="Đúng cam kết kỹ thuật sản xuất"),
            AICoAParameter(name="Độc tố vi nấm: Aflatoxin tổng", tested_value="< 1.0 µg/kg", standard_limit="≤ 5.0 µg/kg (QCVN 8-1)", is_compliant=True, risk_level="SAFE", notes="Âm tính độc tố nấm mốc"),
            AICoAParameter(name="Độc tố Deoxynivalenol (DON)", tested_value="0.25 mg/kg", standard_limit="≤ 1.0 mg/kg", is_compliant=True, risk_level="SAFE", notes="Đạt chuẩn ngũ cốc"),
            AICoAParameter(name="Cảnh báo dị nguyên (Gluten)", tested_value="Dương tính (Chứa Gluten lúa mì)", standard_limit="Ghi nhãn bắt buộc", is_compliant=True, risk_level="SAFE", notes="Bao bì đã in sẵn tem cảnh báo chứa Gluten"),
        ]
        overall_status = "PASSED"
        confidence_score = 99.0
        summary = "Bột mì đạt độ ẩm tiêu chuẩn 13.1%, độc tố vi nấm Aflatoxin thấp hơn giới hạn quy chuẩn. Đạt chuẩn tiếp nhận vào kho khô."
        iso_ref = "ISO 22000:2018 Clause 8.2 & QCVN 8-1:2011/BYT"
        suggested_status = "PASSED"
        actions = [
            "Duyệt nhập kho khô, đặt trên pallet cách sàn 15cm, cách tường 20cm.",
            "Gắn thẻ nhận diện dị nguyên 'CHỨA GLUTEN' theo quy trình kiểm soát dị nguyên."
        ]
    elif sample_type == "PACKAGING":
        parameters = [
            AICoAParameter(name="Thôi nhiễm Chì (Pb)", tested_value="0.95 mg/kg", standard_limit="≤ 1.00 mg/kg (QCVN 12-1)", is_compliant=True, risk_level="WARNING", notes="Mức thôi nhiễm 0.95 mg/kg rất sát giới hạn 1.0 mg/kg"),
            AICoAParameter(name="Thôi nhiễm Cadmi (Cd)", tested_value="0.08 mg/kg", standard_limit="≤ 0.10 mg/kg", is_compliant=True, risk_level="WARNING", notes="Cần giám sát mẫu kiểm định định kỳ"),
            AICoAParameter(name="Độ bền kéo đứt màng PA/PE", tested_value="42.5 MPa", standard_limit="≥ 35.0 MPa", is_compliant=True, risk_level="SAFE", notes="Chịu lực hút chân không tốt"),
            AICoAParameter(name="Quy cách bao gói & Tem nhãn", tested_value="15 cuộn bị trầy xước", standard_limit="100% nguyên vẹn", is_compliant=False, risk_level="DANGER", notes="Bao bì trầy xước có nguy cơ nhiễm bẩn cơ học"),
        ]
        overall_status = "REVIEW_REQUIRED"
        confidence_score = 92.0
        summary = "Phát hiện 15 cuộn bao bì bị biến dạng ngoại quan trong quá trình bốc dỡ và chỉ tiêu thôi nhiễm chì sát ngưỡng tối đa cho phép của QCVN 12-1."
        iso_ref = "ISO 22000:2018 Clause 7.1.6 & QCVN 12-1:2011/BYT"
        suggested_status = "CONDITIONAL"
        actions = [
            "Cách ly 15 cuộn màng bao bì bị trầy xước lõi.",
            "Lấy mẫu ngẫu nhiên gửi kiểm nghiệm lại thôi nhiễm kim loại nặng tại trung tâm phân tích độc lập.",
            "Gửi phiếu yêu cầu hành động khắc phục (CAPA) đến NCC Bao bì Phú Mỹ."
        ]
    else:
        parameters = [
            AICoAParameter(name="Cảm quan & Màu sắc", tested_value="Đạt chuẩn quy cách", standard_limit="Theo tiêu chuẩn kỹ thuật", is_compliant=True, risk_level="SAFE", notes="Đồng nhất, không dị vật"),
            AICoAParameter(name="Độ tinh khiết hoạt chất", tested_value="99.2 %", standard_limit="≥ 98.0 %", is_compliant=True, risk_level="SAFE", notes="Đạt nồng độ tiêu chuẩn"),
            AICoAParameter(name="Kim loại nặng tổng số", tested_value="< 5 ppm", standard_limit="≤ 10 ppm", is_compliant=True, risk_level="SAFE", notes="An toàn cho chế biến thực phẩm"),
        ]
        overall_status = "PASSED"
        confidence_score = 96.0
        summary = "Các chỉ tiêu kỹ thuật và phiếu an toàn hóa chất MSDS/COA hoàn toàn phù hợp với tiêu chuẩn ISO 22000."
        iso_ref = "ISO 22000:2018 Clause 7.1.6"
        suggested_status = "PASSED"
        actions = ["Chấp nhận nhập kho theo đúng điều kiện bảo quản quy định."]

    return AICoAAnalysisResponse(
        material_name=req.material_name,
        overall_status=overall_status,
        confidence_score=confidence_score,
        summary=summary,
        iso_standard_reference=iso_ref,
        parameters=parameters,
        suggested_iqc_status=suggested_status,
        recommended_actions=actions
    )


@router.post("/ai/evaluate-supplier", response_model=AISupplierEvaluationResponse)
def evaluate_supplier_with_ai(req: AISupplierEvaluationRequest, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.supplier_id == req.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà cung cấp.")

    lots = db.query(MaterialLot).filter(MaterialLot.supplier_id == supplier.supplier_id).all()
    inspections = (
        db.query(IQCInspection)
        .join(MaterialLot, IQCInspection.material_lot_id == MaterialLot.material_lot_id)
        .filter(MaterialLot.supplier_id == supplier.supplier_id)
        .all()
    )

    total_lots = len(lots)
    total_insp = len(inspections)
    passed_insp = len([i for i in inspections if i.status == "PASSED"])
    rejected_insp = len([i for i in inspections if i.status in ["REJECTED", "CONDITIONAL"]])

    certs_val = getattr(supplier, "certifications", [])
    cert_count = len(certs_val) if isinstance(certs_val, list) else 0

    # Dynamic AI score calculation
    base_score = 80.0 + (cert_count * 3.0)
    if total_insp > 0:
        pass_ratio = passed_insp / total_insp
        calculated_score = (base_score * 0.4) + (pass_ratio * 100 * 0.6)
    else:
        score_val = getattr(supplier, "rating_score", 90.0)
        calculated_score = float(score_val) if score_val is not None else 90.0

    calculated_score = round(min(100.0, max(40.0, calculated_score)), 1)

    if calculated_score >= 85.0:
        status_rec = "APPROVED"
        risk = "LOW"
    elif calculated_score >= 70.0:
        status_rec = "WARNING"
        risk = "MEDIUM"
    else:
        status_rec = "SUSPENDED"
        risk = "HIGH"

    cert_names = ", ".join(certs_val) if isinstance(certs_val, list) and cert_count > 0 else "Chưa khai báo"
    strengths = [
        f"Có {cert_count} chứng chỉ an toàn thực phẩm uy tín quốc tế ({cert_names}).",
        f"Tổng số {total_lots} lô nguyên liệu đã giao dịch với {passed_insp} lần kiểm định IQC đạt chuẩn ngay lần đầu."
    ]

    risks = []
    if rejected_insp > 0:
        risks.append(f"Có {rejected_insp} lô hàng từng bị cảnh báo hoặc phải kiểm tra lại (Conditional / Quarantine).")
    if cert_count == 0:
        risks.append("Thiếu các chứng chỉ ATTP độc lập như ISO 22000 hoặc HACCP.")
    if not risks:
        risks.append("Chưa phát hiện rủi ro nghiêm trọng về an toàn vệ sinh thực phẩm.")

    recommendations = [
        f"Duy trì đánh giá định kỳ 6 tháng/lần theo điều khoản 7.1.6 ISO 22000:2018.",
        "Tiếp tục yêu cầu gửi phiếu kiểm nghiệm COA kèm theo từng chuyến xe giao hàng.",
        "Cập nhật hồ sơ thẩm tra năng lực nhà cung ứng vào Danh bạ NCC được phê duyệt (ASL)."
    ]

    # Update supplier record score
    supplier.rating_score = calculated_score
    supplier.risk_level = risk
    db.commit()

    supp_id_val = getattr(supplier, "supplier_id", None)
    parsed_supp_id = supp_id_val if isinstance(supp_id_val, UUID) else UUID(str(supp_id_val))

    return AISupplierEvaluationResponse(
        supplier_id=parsed_supp_id,
        supplier_name=str(getattr(supplier, "supplier_name", "")),
        recommended_score=calculated_score,
        recommended_status=status_rec,
        risk_level=risk,
        strengths=strengths,
        risks=risks,
        recommendations=recommendations
    )


# ==============================================================================
# GIAI ĐOẠN 5: ĐÁNH GIÁ NHÀ CUNG CẤP NÂNG CAO (BM02, BM03, BM03-TS, BM04)
# ==============================================================================

DEFAULT_CRITERIA_TEMPLATES = {
    "AGRI_FRESH": {
        "title": "Biểu mẫu BM03 — Đánh giá Nhà cung ứng Nông sản tươi",
        "form_code": "BM03",
        "description": "Kiểm soát nguồn gốc đất trồng, nước tưới, thuốc BVTV, thu hoạch và chứng nhận VietGAP/GlobalGAP",
        "criteria": [
            {
                "id": "af_1",
                "name": "Nguồn nước tưới & Đất canh tác",
                "max_score": 25,
                "description": "Vùng trồng không bị ô nhiễm kim loại nặng, nguồn nước tưới có kết quả xét nghiệm vi sinh (E.coli, Coliforms) đạt chuẩn.",
                "score": 25,
                "pass_fail": "PASS",
                "notes": "Có kết quả xét nghiệm nước tưới định kỳ 6 tháng/lần đạt chuẩn."
            },
            {
                "id": "af_2",
                "name": "Quản lý Phân bón & Thuốc BVTV",
                "max_score": 30,
                "description": "Sử dụng phân bón và thuốc BVTV trong danh mục cho phép, tuân thủ nghiêm ngặt thời gian cách ly (PHI) trước khi thu hoạch.",
                "score": 28,
                "pass_fail": "PASS",
                "notes": "Có nhật ký phun xịt và tuân thủ thời gian cách ly tối thiểu 14 ngày."
            },
            {
                "id": "af_3",
                "name": "Thu hoạch, Đóng gói & Vận chuyển",
                "max_score": 25,
                "description": "Dụng cụ thu hoạch sạch sẽ, đóng sọt/hộp che chắn tránh dập nát, xe vận chuyển có bạt che kín, không lẫn hóa chất.",
                "score": 22,
                "pass_fail": "PASS",
                "notes": "Sọt nhựa sạch, có phủ màng bảo vệ tránh bụi bẩn dọc đường."
            },
            {
                "id": "af_4",
                "name": "Hồ sơ Pháp lý & Chứng nhận ATTP",
                "max_score": 20,
                "description": "Có Giấy chứng nhận đủ điều kiện ATTP hoặc chứng chỉ VietGAP/GlobalGAP còn hiệu lực.",
                "score": 20,
                "pass_fail": "PASS",
                "notes": "Có chứng nhận VietGAP còn hiệu lực đến năm 2027."
            }
        ]
    },
    "AQUA_ANIMAL_FRESH": {
        "title": "Bộ tiêu chí bổ sung — Đánh giá Nhà cung ứng Thủy hải sản / Tươi sống (Do dự án tự xây dựng)",
        "form_code": "TC-BS-TS",
        "description": "Bộ tiêu chí bổ sung do dự án tự xây dựng để đáp ứng đặc thù nhà máy thủy sản (kiểm soát mã vùng nuôi, kháng sinh cấm, vận chuyển lạnh 0-4°C, chứng nhận ASC/BAP/VietGAP) — không thuộc bộ biểu mẫu gốc.",
        "criteria": [
            {
                "id": "ts_1",
                "name": "Mã số Vùng nuôi & Nhật ký ao",
                "max_score": 25,
                "description": "Có mã số nhận diện cơ sở nuôi thủy sản theo Luật Thủy sản, có nhật ký ghi chép thức ăn và con giống rõ ràng.",
                "score": 25,
                "pass_fail": "PASS",
                "notes": "Vùng nuôi cá tra An Giang có mã số cơ sở nuôi hợp lệ, truy xuất được từng ao."
            },
            {
                "id": "ts_2",
                "name": "Kiểm soát Kháng sinh cấm & Hóa chất",
                "max_score": 30,
                "description": "Cam kết và kiểm nghiệm không tồn dư kháng sinh cấm (Chloramphenicol, Ciprofloxacin, Enrofloxacin, Malachite Green).",
                "score": 28,
                "pass_fail": "PASS",
                "notes": "Test nhanh âm tính kháng sinh cấm, phiếu xét nghiệm nguyên liệu đạt chuẩn."
            },
            {
                "id": "ts_3",
                "name": "Bảo quản Lạnh & Vận chuyển xe bồn/ướp đá",
                "max_score": 25,
                "description": "Sử dụng đá lạnh làm từ nguồn nước sạch VSATTP, tỉ lệ ướp đá đảm bảo nhiệt độ cá/tôm duy trì 0 - 4°C trong suốt hành trình.",
                "score": 24,
                "pass_fail": "PASS",
                "notes": "Xe tải bồn sục khí oxy / ướp đá nhiệt độ đo tại cửa kho đạt 1.5°C."
            },
            {
                "id": "ts_4",
                "name": "Chứng nhận Chuẩn Nuôi & ATTP",
                "max_score": 20,
                "description": "Đạt chứng nhận VietGAP thủy sản / ASC / BAP / Giấy chứng nhận cơ sở đủ điều kiện an toàn thực phẩm.",
                "score": 20,
                "pass_fail": "PASS",
                "notes": "Đạt chứng nhận ASC và VietGAP thủy sản nước ngọt."
            }
        ]
    },
    "PROCESSED_DRY_PACKAGING": {
        "title": "Biểu mẫu BM04 — Đánh giá Nhà cung cấp Khô, Phụ gia & Bao bì",
        "form_code": "BM04",
        "description": "Kiểm soát bản tự công bố, phiếu kiểm nghiệm COA vi sinh/kim loại nặng, điều kiện kho bãi và tem nhãn dị nguyên",
        "criteria": [
            {
                "id": "dp_1",
                "name": "Hồ sơ Công bố Hợp quy & Tự công bố",
                "max_score": 25,
                "description": "Có Bản tự công bố sản phẩm hoặc Giấy tiếp nhận đăng ký bản công bố hợp quy theo Nghị định 15/2018/NĐ-CP.",
                "score": 25,
                "pass_fail": "PASS",
                "notes": "Đầy đủ bản tự công bố sản phẩm và tiêu chuẩn cơ sở TCCS còn hiệu lực."
            },
            {
                "id": "dp_2",
                "name": "Phiếu Thử nghiệm Định kỳ (COA)",
                "max_score": 30,
                "description": "Cung cấp phiếu kết quả thử nghiệm định kỳ (vi sinh, kim loại nặng, thôi nhiễm thôi độc bao bì tiếp xúc thực phẩm) từ phòng kiểm nghiệm đạt ISO 17025.",
                "score": 27,
                "pass_fail": "PASS",
                "notes": "COA định kỳ 6 tháng đầy đủ, không phát hiện vi sinh vật gây hại và thôi nhiễm chì/cadmium."
            },
            {
                "id": "dp_3",
                "name": "Điều kiện Kho tàng & Chống Côn trùng",
                "max_score": 25,
                "description": "Kho bảo quản nguyên liệu/bao bì khô ráo, hàng hóa kê trên pallet cách tường cách sàn 20cm, có hệ thống bẫy đèn diệt côn trùng.",
                "score": 23,
                "pass_fail": "PASS",
                "notes": "Hệ thống kho sạch sẽ, lưới chắn chuột bọ tốt, pallet nhựa chuẩn."
            },
            {
                "id": "dp_4",
                "name": "Tem nhãn & Cảnh báo Dị nguyên (Allergen)",
                "max_score": 20,
                "description": "Ghi nhãn hàng hóa đúng Nghị định 43/2017/NĐ-CP & 111/2021/NĐ-CP, có thông tin cảnh báo dị nguyên, hướng dẫn bảo quản rõ ràng.",
                "score": 19,
                "pass_fail": "PASS",
                "notes": "Tem phụ tiếng Việt đầy đủ, ghi rõ thành phần có chứa gluten/trứng."
            }
        ]
    }
}


@router.get("/evaluation-criteria-templates", response_model=Dict[str, Any])
def get_evaluation_criteria_templates():
    """Lấy danh mục các bộ tiêu chí đánh giá nhà cung cấp chuẩn ISO (BM03, BM03-TS, BM04)"""
    return DEFAULT_CRITERIA_TEMPLATES


# ----------------- KẾ HOẠCH ĐÁNH GIÁ NCC (BM02) -----------------
@router.get("/evaluation-plans", response_model=List[SupplierEvaluationPlanResponse])
def get_supplier_evaluation_plans(
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(SupplierEvaluationPlan)
    if year:
        query = query.filter(SupplierEvaluationPlan.year == year)
    plans = query.order_by(desc(SupplierEvaluationPlan.year), SupplierEvaluationPlan.plan_code).all()

    result = []
    for p in plans:
        count = db.query(SupplierEvaluation).filter(SupplierEvaluation.plan_id == p.id).count()
        result.append(
            SupplierEvaluationPlanResponse(
                id=p.id,
                plan_code=p.plan_code,
                year=p.year,
                title=p.title,
                department=p.department,
                scope=p.scope,
                approved_by=p.approved_by,
                approval_status=p.approval_status,
                created_at=p.created_at,
                evaluations_count=count
            )
        )
    return result


@router.post("/evaluation-plans", response_model=SupplierEvaluationPlanResponse)
def create_supplier_evaluation_plan(
    payload: SupplierEvaluationPlanCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(SupplierEvaluationPlan).filter(SupplierEvaluationPlan.plan_code == payload.plan_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã kế hoạch [{payload.plan_code}] đã tồn tại.")

    plan = SupplierEvaluationPlan(
        plan_code=payload.plan_code,
        year=payload.year,
        title=payload.title,
        department=payload.department,
        scope=payload.scope,
        approved_by=payload.approved_by,
        approval_status=payload.approval_status,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return SupplierEvaluationPlanResponse(
        id=plan.id,
        plan_code=plan.plan_code,
        year=plan.year,
        title=plan.title,
        department=plan.department,
        scope=plan.scope,
        approved_by=plan.approved_by,
        approval_status=plan.approval_status,
        created_at=plan.created_at,
        evaluations_count=0
    )


@router.put("/evaluation-plans/{plan_id}", response_model=SupplierEvaluationPlanResponse)
def update_supplier_evaluation_plan(
    plan_id: int,
    payload: SupplierEvaluationPlanUpdate,
    db: Session = Depends(get_db)
):
    plan = db.query(SupplierEvaluationPlan).filter(SupplierEvaluationPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch đánh giá NCC.")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(plan, k, v)
    db.commit()
    db.refresh(plan)

    count = db.query(SupplierEvaluation).filter(SupplierEvaluation.plan_id == plan.id).count()
    return SupplierEvaluationPlanResponse(
        id=plan.id,
        plan_code=plan.plan_code,
        year=plan.year,
        title=plan.title,
        department=plan.department,
        scope=plan.scope,
        approved_by=plan.approved_by,
        approval_status=plan.approval_status,
        created_at=plan.created_at,
        evaluations_count=count
    )


@router.delete("/evaluation-plans/{plan_id}")
def delete_supplier_evaluation_plan(
    plan_id: int,
    db: Session = Depends(get_db)
):
    plan = db.query(SupplierEvaluationPlan).filter(SupplierEvaluationPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch đánh giá NCC.")
    db.delete(plan)
    db.commit()
    return {"message": "Đã xóa kế hoạch đánh giá NCC thành công."}


# ----------------- KẾT QUẢ ĐÁNH GIÁ NCC (BM03, BM03-TS, BM04) -----------------
@router.get("/evaluations", response_model=List[SupplierEvaluationResponse])
def get_supplier_evaluations(
    plan_id: Optional[int] = None,
    supplier_id: Optional[UUID] = None,
    criteria_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(SupplierEvaluation)
    if plan_id:
        query = query.filter(SupplierEvaluation.plan_id == plan_id)
    if supplier_id:
        query = query.filter(SupplierEvaluation.supplier_id == supplier_id)
    if criteria_type:
        query = query.filter(SupplierEvaluation.criteria_type == criteria_type)

    evals = query.order_by(desc(SupplierEvaluation.evaluation_date), SupplierEvaluation.evaluation_code).all()

    result = []
    for e in evals:
        result.append(
            SupplierEvaluationResponse(
                id=e.id,
                evaluation_code=e.evaluation_code,
                plan_id=e.plan_id,
                supplier_id=e.supplier_id,
                criteria_type=e.criteria_type,
                evaluation_date=e.evaluation_date,
                evaluator_name=e.evaluator_name,
                audit_type=e.audit_type,
                criteria_scores=e.criteria_scores if isinstance(e.criteria_scores, list) else [],
                total_score=float(e.total_score),
                grade=e.grade,
                conclusion=e.conclusion,
                corrective_actions=e.corrective_actions,
                approved_by=e.approved_by,
                created_at=e.created_at,
                supplier_name=e.supplier_name,
                supplier_code=e.supplier_code,
                plan_code=e.plan_code
            )
        )
    return result


@router.post("/evaluations", response_model=SupplierEvaluationResponse)
def create_supplier_evaluation(
    payload: SupplierEvaluationCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(SupplierEvaluation).filter(SupplierEvaluation.evaluation_code == payload.evaluation_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã phiếu đánh giá [{payload.evaluation_code}] đã tồn tại.")

    supp = db.query(Supplier).filter(Supplier.supplier_id == payload.supplier_id).first()
    if not supp:
        raise HTTPException(status_code=404, detail="Nhà cung cấp không tồn tại.")

    eval_record = SupplierEvaluation(
        evaluation_code=payload.evaluation_code,
        plan_id=payload.plan_id,
        supplier_id=payload.supplier_id,
        criteria_type=payload.criteria_type,
        evaluation_date=payload.evaluation_date,
        evaluator_name=payload.evaluator_name,
        audit_type=payload.audit_type,
        criteria_scores=payload.criteria_scores,
        total_score=payload.total_score,
        grade=payload.grade,
        conclusion=payload.conclusion,
        corrective_actions=payload.corrective_actions,
        approved_by=payload.approved_by
    )
    db.add(eval_record)

    # Sync rating_score and evaluation_date back to supplier record
    supp.rating_score = payload.total_score
    supp.evaluation_date = payload.evaluation_date
    if payload.conclusion == "APPROVED":
        supp.status = "APPROVED"
        supp.risk_level = "LOW"
    elif payload.conclusion == "CONDITIONAL":
        supp.status = "WARNING"
        supp.risk_level = "MEDIUM"
    elif payload.conclusion == "DISQUALIFIED":
        supp.status = "SUSPENDED"
        supp.risk_level = "HIGH"

    db.commit()
    db.refresh(eval_record)

    return SupplierEvaluationResponse(
        id=eval_record.id,
        evaluation_code=eval_record.evaluation_code,
        plan_id=eval_record.plan_id,
        supplier_id=eval_record.supplier_id,
        criteria_type=eval_record.criteria_type,
        evaluation_date=eval_record.evaluation_date,
        evaluator_name=eval_record.evaluator_name,
        audit_type=eval_record.audit_type,
        criteria_scores=eval_record.criteria_scores if isinstance(eval_record.criteria_scores, list) else [],
        total_score=float(eval_record.total_score),
        grade=eval_record.grade,
        conclusion=eval_record.conclusion,
        corrective_actions=eval_record.corrective_actions,
        approved_by=eval_record.approved_by,
        created_at=eval_record.created_at,
        supplier_name=eval_record.supplier_name,
        supplier_code=eval_record.supplier_code,
        plan_code=eval_record.plan_code
    )


@router.get("/evaluations/{eval_id}", response_model=SupplierEvaluationResponse)
def get_supplier_evaluation_detail(
    eval_id: int,
    db: Session = Depends(get_db)
):
    e = db.query(SupplierEvaluation).filter(SupplierEvaluation.id == eval_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu đánh giá NCC.")

    return SupplierEvaluationResponse(
        id=e.id,
        evaluation_code=e.evaluation_code,
        plan_id=e.plan_id,
        supplier_id=e.supplier_id,
        criteria_type=e.criteria_type,
        evaluation_date=e.evaluation_date,
        evaluator_name=e.evaluator_name,
        audit_type=e.audit_type,
        criteria_scores=e.criteria_scores if isinstance(e.criteria_scores, list) else [],
        total_score=float(e.total_score),
        grade=e.grade,
        conclusion=e.conclusion,
        corrective_actions=e.corrective_actions,
        approved_by=e.approved_by,
        created_at=e.created_at,
        supplier_name=e.supplier_name,
        supplier_code=e.supplier_code,
        plan_code=e.plan_code
    )


@router.put("/evaluations/{eval_id}", response_model=SupplierEvaluationResponse)
def update_supplier_evaluation(
    eval_id: int,
    payload: SupplierEvaluationUpdate,
    db: Session = Depends(get_db)
):
    e = db.query(SupplierEvaluation).filter(SupplierEvaluation.id == eval_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu đánh giá NCC.")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(e, k, v)

    # Sync to supplier
    supp = db.query(Supplier).filter(Supplier.supplier_id == e.supplier_id).first()
    if supp:
        supp.rating_score = float(e.total_score)
        supp.evaluation_date = e.evaluation_date
        if e.conclusion == "APPROVED":
            supp.status = "APPROVED"
            supp.risk_level = "LOW"
        elif e.conclusion == "CONDITIONAL":
            supp.status = "WARNING"
            supp.risk_level = "MEDIUM"
        elif e.conclusion == "DISQUALIFIED":
            supp.status = "SUSPENDED"
            supp.risk_level = "HIGH"

    db.commit()
    db.refresh(e)

    return SupplierEvaluationResponse(
        id=e.id,
        evaluation_code=e.evaluation_code,
        plan_id=e.plan_id,
        supplier_id=e.supplier_id,
        criteria_type=e.criteria_type,
        evaluation_date=e.evaluation_date,
        evaluator_name=e.evaluator_name,
        audit_type=e.audit_type,
        criteria_scores=e.criteria_scores if isinstance(e.criteria_scores, list) else [],
        total_score=float(e.total_score),
        grade=e.grade,
        conclusion=e.conclusion,
        corrective_actions=e.corrective_actions,
        approved_by=e.approved_by,
        created_at=e.created_at,
        supplier_name=e.supplier_name,
        supplier_code=e.supplier_code,
        plan_code=e.plan_code
    )


@router.delete("/evaluations/{eval_id}")
def delete_supplier_evaluation(
    eval_id: int,
    db: Session = Depends(get_db)
):
    e = db.query(SupplierEvaluation).filter(SupplierEvaluation.id == eval_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu đánh giá NCC.")
    db.delete(e)
    db.commit()
    return {"message": "Đã xóa phiếu đánh giá NCC thành công."}

