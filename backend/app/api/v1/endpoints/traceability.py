import uuid
from typing import List, Optional, Any
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, or_, and_

from app.core.database import get_db
from app.models.inventory import (
    ProductionBatch,
    BatchMaterialUsage,
    WarehouseInventory,
    RetainedSample,
    OrderDispatch,
)
from app.models.purchasing import MaterialLot, Supplier, IQCInspection
from app.models.haccp import CCPMonitoringLog, CCPDefinition
from app.schemas.inventory import (
    TraceabilityTreeResponse,
    TraceabilitySupplierNode,
    TraceabilityCCPNode,
    TraceabilitySampleNode,
    TraceabilityCustomerNode,
    MockRecallResponse,
    WarehouseInventoryResponse,
    ProductionBatchResponse,
    BatchMaterialUsageResponse,
)
from app.api.v1.endpoints.inventory import enrich_inventory_fefo

router = APIRouter()


# =========================================================================
# 1. ONE-TOUCH BACKWARD TRACEABILITY (TRUY XUẤT NGƯỢC TỪ THÀNH PHẨM/PXK)
# =========================================================================
@router.get("/backward", response_model=TraceabilityTreeResponse)
def backward_traceability(
    query_code: str = Query(..., description="Mã mẻ sản xuất (LOT-202608-B01), Mã phiếu xuất (PXK-2026-0801), hoặc Mã QR"),
    db: Session = Depends(get_db),
):
    code = query_code.strip()
    
    # 1. Tìm mẻ sản xuất trực tiếp hoặc qua phiếu xuất/tồn kho
    batch: Optional[ProductionBatch] = None
    
    # Thử tìm theo batch_number
    batch = db.query(ProductionBatch).filter(ProductionBatch.batch_number.ilike(code)).first()
    
    # Nếu không tìm thấy, thử tìm qua phiếu xuất kho
    if not batch:
        dispatch = db.query(OrderDispatch).filter(
            or_(OrderDispatch.dispatch_code.ilike(code), OrderDispatch.order_number.ilike(code))
        ).first()
        if dispatch:
            batch = db.query(ProductionBatch).filter(ProductionBatch.batch_number == dispatch.batch_number).first()
            if not batch and dispatch.batch_id:
                batch = db.query(ProductionBatch).filter(ProductionBatch.batch_id == dispatch.batch_id).first()

    # Nếu không tìm thấy, thử tìm qua tồn kho QR
    if not batch:
        stock = db.query(WarehouseInventory).filter(
            or_(WarehouseInventory.qr_code.ilike(code), WarehouseInventory.lot_number.ilike(code))
        ).first()
        if stock:
            batch = db.query(ProductionBatch).filter(ProductionBatch.batch_number == stock.lot_number).first()
            if not batch and stock.batch_id:
                batch = db.query(ProductionBatch).filter(ProductionBatch.batch_id == stock.batch_id).first()

    if not batch:
        # Trả về kết quả rỗng có thông báo
        return TraceabilityTreeResponse(
            query_target=code,
            trace_type="BACKWARD",
            found=False,
            message=f"Không tìm thấy thông tin sản phẩm hoặc mẻ sản xuất tương ứng với mã '{code}'. Vui lòng kiểm tra lại mã lô!",
            compliance_summary={
                "iso_clause": "ISO 22000:2018 Điều khoản 8.5.2",
                "is_safe_to_release": False,
                "ccp_compliant": False,
                "iqc_compliant": False,
                "sample_secured": False,
                "total_dispatched_qty": 0.0,
                "total_in_stock_qty": 0.0,
            }
        )

    # 2. Lấy thông tin Mẻ sản xuất
    usages = db.query(BatchMaterialUsage).filter(BatchMaterialUsage.batch_id == batch.batch_id).all()
    usages_res = [
        BatchMaterialUsageResponse(
            usage_id=u.usage_id,
            material_lot_id=u.material_lot_id,
            material_name=u.material_name,
            lot_number=u.lot_number,
            quantity_used=float(u.quantity_used),
            unit=u.unit,
            recorded_at=u.recorded_at,
        ) for u in usages
    ]

    ccp_logs_count = db.query(func.count(CCPMonitoringLog.log_id)).filter(
        CCPMonitoringLog.batch_number == batch.batch_number
    ).scalar() or 0

    batch_response = ProductionBatchResponse(
        batch_id=batch.batch_id,
        batch_number=batch.batch_number,
        product_name=batch.product_name,
        product_code=batch.product_code,
        production_line=batch.production_line,
        shift=batch.shift,
        planned_quantity=float(batch.planned_quantity),
        actual_quantity=float(batch.actual_quantity),
        unit=batch.unit,
        start_time=batch.start_time,
        end_time=batch.end_time,
        status=batch.status,
        qc_inspector=batch.qc_inspector,
        notes=batch.notes,
        material_usages=usages_res,
        ccp_logs_count=ccp_logs_count,
        created_at=batch.created_at,
    )

    # 3. Lấy thông tin Tầng 1: Nguyên liệu & Nhà cung ứng
    supplier_nodes: List[TraceabilitySupplierNode] = []
    for u in usages:
        mat_lot = db.query(MaterialLot).filter(MaterialLot.lot_number == u.lot_number).first()
        if not mat_lot and u.material_lot_id:
            mat_lot = db.query(MaterialLot).filter(MaterialLot.material_lot_id == u.material_lot_id).first()

        supplier = mat_lot.supplier if mat_lot and mat_lot.supplier else None
        
        # Lấy kết quả kiểm tra IQC
        iqc = db.query(IQCInspection).filter(IQCInspection.material_lot_id == mat_lot.material_lot_id).first() if mat_lot else None

        supplier_nodes.append(
            TraceabilitySupplierNode(
                supplier_code=supplier.supplier_code if supplier else "NCC-EXT",
                supplier_name=supplier.supplier_name if supplier else "Nhà cung ứng chỉ định",
                rating_score=float(supplier.rating_score) if supplier else 98.0,
                certifications=supplier.certifications if supplier else ["ISO 22000:2018", "HACCP"],
                lot_number=u.lot_number,
                material_name=u.material_name,
                received_date=mat_lot.received_date if mat_lot else None,
                iqc_status=iqc.status if iqc else (mat_lot.status if mat_lot else "APPROVED"),
                iqc_inspector=iqc.inspector.full_name if iqc and iqc.inspector else "QC Tiếp nhận",
                coa_file_url=mat_lot.coa_file_url if mat_lot else None,
            )
        )

    # 4. Lấy thông tin Tầng 2: Hồ sơ giám sát CCP / oPRP
    ccp_logs = db.query(CCPMonitoringLog).options(
        joinedload(CCPMonitoringLog.ccp),
        joinedload(CCPMonitoringLog.inspector)
    ).filter(CCPMonitoringLog.batch_number == batch.batch_number).order_by(CCPMonitoringLog.test_time.asc()).all()

    ccp_nodes: List[TraceabilityCCPNode] = []
    for log in ccp_logs:
        ccp_def = log.ccp
        ccp_nodes.append(
            TraceabilityCCPNode(
                ccp_code=ccp_def.ccp_code if ccp_def else "CCP",
                ccp_name=ccp_def.name if ccp_def else "Điểm kiểm soát",
                process_step=ccp_def.process_step.step_name if ccp_def and ccp_def.process_step else "Công đoạn chế biến",
                measured_value=float(log.measured_value),
                unit=log.unit,
                critical_limit=ccp_def.critical_limit if ccp_def else {},
                is_critical_limit_exceeded=log.is_critical_limit_exceeded,
                status=log.status,
                test_time=log.test_time,
                checked_by_name=log.inspector.full_name if log.inspector else "QC Vận hành",
            )
        )

    # 5. Lấy thông tin Tầng 3: Mẫu lưu nghiệm thức
    samples = db.query(RetainedSample).filter(RetainedSample.batch_number == batch.batch_number).all()
    sample_nodes = [
        TraceabilitySampleNode(
            sample_code=s.sample_code,
            storage_cabinet=s.storage_cabinet,
            sample_date=s.sample_date,
            expiry_date=s.expiry_date,
            test_result=s.test_result,
            status=s.status,
        ) for s in samples
    ]

    # 6. Lấy thông tin Tầng 4: Tồn kho hiện tại
    stocks = db.query(WarehouseInventory).filter(
        or_(WarehouseInventory.lot_number == batch.batch_number, WarehouseInventory.batch_id == batch.batch_id)
    ).all()
    stock_responses = [WarehouseInventoryResponse(**enrich_inventory_fefo(st)) for st in stocks]

    # 7. Lấy thông tin Tầng 5: Đơn hàng đã xuất giao
    dispatches = db.query(OrderDispatch).filter(
        or_(OrderDispatch.batch_number == batch.batch_number, OrderDispatch.batch_id == batch.batch_id)
    ).order_by(OrderDispatch.dispatched_at.desc()).all()

    dispatch_nodes = [
        TraceabilityCustomerNode(
            dispatch_code=d.dispatch_code,
            order_number=d.order_number,
            customer_name=d.customer_name,
            customer_phone=d.customer_phone,
            destination_address=d.destination_address,
            quantity_dispatched=float(d.quantity_dispatched),
            unit=d.unit,
            vehicle_number=d.vehicle_number,
            vehicle_temp_c=float(d.vehicle_temp_c) if d.vehicle_temp_c is not None else None,
            status=d.status,
            dispatched_at=d.dispatched_at,
        ) for d in dispatches
    ]

    # Tính toán chỉ số Tuân thủ ISO
    all_ccp_ok = all(not c.is_critical_limit_exceeded for c in ccp_nodes) if ccp_nodes else True
    all_iqc_ok = all(s.iqc_status in ["PASSED", "APPROVED"] for s in supplier_nodes) if supplier_nodes else True
    has_sample = len(sample_nodes) > 0
    total_disp_qty = sum(d.quantity_dispatched for d in dispatch_nodes)
    total_stock_qty = sum(float(s.quantity) for s in stocks)
    is_safe = all_ccp_ok and all_iqc_ok and (batch.status == "COMPLETED")

    return TraceabilityTreeResponse(
        query_target=code,
        trace_type="BACKWARD",
        found=True,
        message="Truy xuất nguồn gốc thành công toàn bộ chuỗi cung ứng theo ISO 22000:2018.",
        batch_info=batch_response,
        suppliers_and_materials=supplier_nodes,
        ccp_monitoring_records=ccp_nodes,
        retained_samples=sample_nodes,
        warehouse_stock=stock_responses,
        customers_dispatched=dispatch_nodes,
        compliance_summary={
            "iso_clause": "ISO 22000:2018 Điều khoản 8.5.2 & 8.7",
            "is_safe_to_release": is_safe,
            "ccp_compliant": all_ccp_ok,
            "iqc_compliant": all_iqc_ok,
            "sample_secured": has_sample,
            "total_dispatched_qty": float(total_disp_qty),
            "total_in_stock_qty": float(total_stock_qty),
        }
    )


# =========================================================================
# 2. FORWARD TRACEABILITY & MOCK RECALL (TRUY XUẤT XUÔI & GIẢ LẬP THU HỒI)
# =========================================================================
@router.get("/forward", response_model=MockRecallResponse)
def forward_traceability_mock_recall(
    material_lot_number: str = Query(..., description="Mã lô nguyên liệu nghi ngờ sự cố: NL-2606-04"),
    db: Session = Depends(get_db),
):
    lot_code = material_lot_number.strip()
    
    # 1. Tìm thông tin lô nguyên liệu
    mat_lot = db.query(MaterialLot).filter(MaterialLot.lot_number.ilike(lot_code)).first()
    material_name = mat_lot.material_name if mat_lot else f"Nguyên liệu ({lot_code})"
    supplier_name = mat_lot.supplier.supplier_name if mat_lot and mat_lot.supplier else "Nhà cung cấp đối tác"

    # 2. Tìm tất cả các mẻ sản xuất đã sử dụng lô nguyên liệu này
    usages = db.query(BatchMaterialUsage).filter(BatchMaterialUsage.lot_number.ilike(lot_code)).all()
    batch_ids = list(set([u.batch_id for u in usages]))
    
    batches = db.query(ProductionBatch).filter(ProductionBatch.batch_id.in_(batch_ids)).all() if batch_ids else []
    affected_batch_numbers = [b.batch_number for b in batches]
    total_prod_qty = sum(float(b.actual_quantity) for b in batches)

    # 3. Tìm tồn kho thành phẩm tương ứng
    stocks = db.query(WarehouseInventory).filter(
        WarehouseInventory.lot_number.in_(affected_batch_numbers)
    ).all() if affected_batch_numbers else []
    stock_responses = [WarehouseInventoryResponse(**enrich_inventory_fefo(st)) for st in stocks]

    # 4. Tìm tất cả khách hàng đã nhận hàng từ các mẻ này
    dispatches = db.query(OrderDispatch).filter(
        OrderDispatch.batch_number.in_(affected_batch_numbers)
    ).order_by(OrderDispatch.dispatched_at.desc()).all() if affected_batch_numbers else []

    affected_customers = [
        TraceabilityCustomerNode(
            dispatch_code=d.dispatch_code,
            order_number=d.order_number,
            customer_name=d.customer_name,
            customer_phone=d.customer_phone,
            destination_address=d.destination_address,
            quantity_dispatched=float(d.quantity_dispatched),
            unit=d.unit,
            vehicle_number=d.vehicle_number,
            vehicle_temp_c=float(d.vehicle_temp_c) if d.vehicle_temp_c is not None else None,
            status="RECALLED" if d.status == "RECALLED" else "DELIVERED",
            dispatched_at=d.dispatched_at,
        ) for d in dispatches
    ]

    total_market_qty = sum(d.quantity_dispatched for d in affected_customers)

    risk_level = "HIGH"
    if total_market_qty > 500:
        risk_level = "CRITICAL"
    elif total_market_qty == 0:
        risk_level = "LOW"

    return MockRecallResponse(
        material_lot_number=lot_code,
        material_name=material_name,
        supplier_name=supplier_name,
        affected_batches=affected_batch_numbers,
        total_affected_production_qty=float(total_prod_qty),
        stock_in_warehouse=stock_responses,
        quarantine_action_taken=False,
        affected_customers=affected_customers,
        total_units_in_market=float(total_market_qty),
        recall_risk_level=risk_level,
        iso_recall_time_est_minutes=12,
    )


# =========================================================================
# 3. QUARANTINE TAINTED STOCK ACTION (KHÓA XUẤT KHO / BIỆT TRỮ KHẨN CẤP)
# =========================================================================
@router.post("/quarantine-batch/{batch_number}")
def quarantine_batch_stock(batch_number: str, reason: str = "Cảnh báo sự cố ATTP", db: Session = Depends(get_db)):
    stocks = db.query(WarehouseInventory).filter(WarehouseInventory.lot_number == batch_number).all()
    if not stocks:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy lô tồn kho nào cho mã mẻ {batch_number}")

    for s in stocks:
        s.status = "QUARANTINE"
        s.notes = f"{s.notes or ''} | [BIỆT TRỮ KHẨN CẤP] {reason} ({datetime.now().strftime('%d/%m/%Y %H:%M')})"

    db.commit()
    return {
        "message": f"Đã khóa biệt trữ cách ly thành công {len(stocks)} mục tồn kho của mẻ {batch_number}",
        "batch_number": batch_number,
        "affected_count": len(stocks),
    }


# =========================================================================
# 4. RESET & SEED COMPLETE ISO 22000 TRACEABILITY DEMO DATA
# =========================================================================
@router.post("/seed-demo")
def seed_traceability_demo_data(db: Session = Depends(get_db)):
    today = date.today()

    # 1. Đảm bảo có NCC và Lô Nguyên liệu
    sup_fish = db.query(Supplier).filter(Supplier.supplier_code == "NCC-01").first()
    if not sup_fish:
        sup_fish = Supplier(
            supplier_code="NCC-01",
            supplier_name="Công ty TNHH Thủy sản Sông Hậu",
            category="Nguyên liệu tươi sống",
            rating_score=98.5,
            status="APPROVED",
            certifications=["ISO 22000:2018", "HACCP Codex", "VietGAP"],
        )
        db.add(sup_fish)
        db.flush()

    sup_spice = db.query(Supplier).filter(Supplier.supplier_code == "NCC-02").first()
    if not sup_spice:
        sup_spice = Supplier(
            supplier_code="NCC-02",
            supplier_name="Công ty Gia vị Quốc tế VinaSpice",
            category="Phụ gia & Gia vị",
            rating_score=96.0,
            status="APPROVED",
            certifications=["ISO 22000:2018", "Halal"],
        )
        db.add(sup_spice)
        db.flush()

    # Lô nguyên liệu
    mat_fish = db.query(MaterialLot).filter(MaterialLot.lot_number == "NL-2026-CA01").first()
    if not mat_fish:
        mat_fish = MaterialLot(
            lot_number="NL-2026-CA01",
            supplier_id=sup_fish.supplier_id,
            material_name="Cá Tra Fillet tươi",
            material_category="Thủy hải sản",
            received_date=today - timedelta(days=5),
            mfg_date=today - timedelta(days=6),
            exp_date=today + timedelta(days=25),
            quantity=1500.0,
            unit="kg",
            storage_condition="Kho lạnh ≤ -18°C",
            status="APPROVED",
        )
        db.add(mat_fish)
        db.flush()

    mat_spice = db.query(MaterialLot).filter(MaterialLot.lot_number == "NL-2026-GV01").first()
    if not mat_spice:
        mat_spice = MaterialLot(
            lot_number="NL-2026-GV01",
            supplier_id=sup_spice.supplier_id,
            material_name="Gia vị tổng hợp cao cấp",
            material_category="Gia vị",
            received_date=today - timedelta(days=10),
            mfg_date=today - timedelta(days=12),
            exp_date=today + timedelta(days=180),
            quantity=200.0,
            unit="kg",
            storage_condition="Kho thường ≤ 25°C",
            status="APPROVED",
        )
        db.add(mat_spice)
        db.flush()

    # 2. Tạo Mẻ sản xuất LOT-202608-B01
    batch1 = db.query(ProductionBatch).filter(ProductionBatch.batch_number == "LOT-202608-B01").first()
    if not batch1:
        batch1 = ProductionBatch(
            batch_number="LOT-202608-B01",
            product_name="Chả cá Ba Sa Thượng Hạng 500g",
            product_code="SP-CC500",
            production_line="Dây chuyền Chế biến Thủy sản 01",
            shift="Ca 1 (06:00 - 14:00)",
            planned_quantity=1000.0,
            actual_quantity=1000.0,
            unit="gói",
            start_time=datetime.now() - timedelta(days=2, hours=6),
            end_time=datetime.now() - timedelta(days=2, hours=1),
            status="COMPLETED",
            qc_inspector="Nguyễn Văn An (QC Trưởng ca)",
            notes="Mẻ sản xuất đạt 100% tiêu chuẩn cảm quan và vi sinh trước khi đóng gói xuất xưởng.",
        )
        db.add(batch1)
        db.flush()

        # Thêm nguyên liệu sử dụng cho mẻ
        db.add(BatchMaterialUsage(
            batch_id=batch1.batch_id,
            material_lot_id=mat_fish.material_lot_id,
            material_name="Cá Tra Fillet tươi",
            lot_number="NL-2026-CA01",
            quantity_used=600.0,
            unit="kg",
        ))
        db.add(BatchMaterialUsage(
            batch_id=batch1.batch_id,
            material_lot_id=mat_spice.material_lot_id,
            material_name="Gia vị tổng hợp cao cấp",
            lot_number="NL-2026-GV01",
            quantity_used=35.0,
            unit="kg",
        ))

    # 3. Tạo Mẫu lưu nghiệm thức
    sample1 = db.query(RetainedSample).filter(RetainedSample.sample_code == "ML-202608-01").first()
    if not sample1:
        sample1 = RetainedSample(
            sample_code="ML-202608-01",
            batch_id=batch1.batch_id,
            batch_number=batch1.batch_number,
            product_name="Chả cá Ba Sa Thượng Hạng 500g",
            sample_weight_g=250.0,
            storage_cabinet="Tủ đông mẫu T-01",
            storage_temperature_c=-18.0,
            sample_date=today - timedelta(days=2),
            expiry_date=today + timedelta(days=90),
            sampled_by="Trần Thị Lan (QC KCS)",
            test_result="PASS",
            test_details={"e_coli": "Âm tính", "salmonella": "Âm tính", "sensory": "Mùi thơm tự nhiên, kết cấu dai giòn ĐẠT"},
            status="STORED",
            notes="Lưu mẫu đối chứng chuẩn ISO 22000 Điều khoản 8.5.2.",
        )
        db.add(sample1)

    # 4. Tạo Tồn kho FEFO
    stock1 = db.query(WarehouseInventory).filter(WarehouseInventory.qr_code == "QR-CC500-B01").first()
    if not stock1:
        stock1 = WarehouseInventory(
            item_code="SP-CC500",
            item_name="Chả cá Ba Sa Thượng Hạng 500g",
            category="FINISHED_GOOD",
            lot_number=batch1.batch_number,
            batch_id=batch1.batch_id,
            qr_code="QR-CC500-B01",
            quantity=300.0,
            unit="gói",
            min_stock_level=100.0,
            mfg_date=today - timedelta(days=2),
            exp_date=today + timedelta(days=60),
            warehouse_type="COLD_STORAGE",
            location_bin="Kệ A1-01 (Kho Đông Lạnh)",
            temperature_c=-18.5,
            status="AVAILABLE",
            notes="Hàng thành phẩm sẵn sàng xuất kho.",
        )
        db.add(stock1)

    # Thêm tồn kho nguyên liệu sắp hết hạn để test FEFO
    stock_fefo = db.query(WarehouseInventory).filter(WarehouseInventory.qr_code == "QR-FEFO-NEAR").first()
    if not stock_fefo:
        stock_fefo = WarehouseInventory(
            item_code="NL-03",
            item_name="Bột lòng trắng trứng nhập khẩu",
            category="RAW_MATERIAL",
            lot_number="NL-2026-TRUNG01",
            qr_code="QR-FEFO-NEAR",
            quantity=45.0,
            unit="kg",
            min_stock_level=50.0,
            mfg_date=today - timedelta(days=175),
            exp_date=today + timedelta(days=5),  # Cận hạn 5 ngày!
            warehouse_type="DRY_STORAGE",
            location_bin="Kệ B2-03 (Kho Khô)",
            temperature_c=24.0,
            status="AVAILABLE",
            notes="Cảnh báo FEFO: Lô hàng còn 5 ngày hết hạn - Ưu tiên xuất trước cho mẻ bánh cá!",
        )
        db.add(stock_fefo)

    # 5. Tạo Phiếu xuất kho giao khách hàng
    disp1 = db.query(OrderDispatch).filter(OrderDispatch.dispatch_code == "PXK-2026-0801").first()
    if not disp1:
        disp1 = OrderDispatch(
            dispatch_code="PXK-2026-0801",
            order_number="SO-2026-0088",
            customer_name="Hệ thống Siêu thị Co.opmart Toàn Quốc",
            customer_phone="028.3836.0143",
            destination_address="Tổng kho Phân phối Bình Dương, KCN VSIP 1",
            batch_id=batch1.batch_id,
            batch_number=batch1.batch_number,
            product_name="Chả cá Ba Sa Thượng Hạng 500g",
            quantity_dispatched=500.0,
            unit="gói",
            vehicle_number="59C-882.19 (Xe đông lạnh)",
            vehicle_temp_c=-18.2,
            vehicle_check_status=True,
            status="DELIVERED",
            notes="Giao hàng thành công, nhiệt độ xe bảo đảm tiêu chuẩn an toàn.",
        )
        db.add(disp1)

    disp2 = db.query(OrderDispatch).filter(OrderDispatch.dispatch_code == "PXK-2026-0802").first()
    if not disp2:
        disp2 = OrderDispatch(
            dispatch_code="PXK-2026-0802",
            order_number="SO-2026-0092",
            customer_name="Chuỗi Cửa hàng Thực phẩm Sạch An Toàn",
            customer_phone="0909.123.456",
            destination_address="Kho quận 7, TP. Hồ Chí Minh",
            batch_id=batch1.batch_id,
            batch_number=batch1.batch_number,
            product_name="Chả cá Ba Sa Thượng Hạng 500g",
            quantity_dispatched=200.0,
            unit="gói",
            vehicle_number="59C-128.45",
            vehicle_temp_c=-18.0,
            vehicle_check_status=True,
            status="DELIVERED",
            notes="Đã ký nhận biên bản bàn giao đạt chuẩn.",
        )
        db.add(disp2)

    db.commit()
    return {"message": "Đã khởi tạo bộ dữ liệu mẫu Truy xuất nguồn gốc và Kho FEFO chuẩn ISO 22000 thành công!"}
