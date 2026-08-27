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
from app.models.haccp import CCPMonitoringLog
from app.schemas.inventory import (
    WarehouseInventoryCreate,
    WarehouseInventoryUpdate,
    WarehouseInventoryResponse,
    RetainedSampleCreate,
    RetainedSampleUpdate,
    RetainedSampleResponse,
    ProductionBatchCreate,
    ProductionBatchUpdate,
    ProductionBatchResponse,
    BatchMaterialUsageResponse,
    OrderDispatchCreate,
    OrderDispatchUpdate,
    OrderDispatchResponse,
)

router = APIRouter()


# =========================================================================
# HELPER: DYNAMIC FEFO CALCULATION
# =========================================================================
def enrich_inventory_fefo(item: WarehouseInventory) -> dict:
    today = date.today()
    days_to_expiry = (item.exp_date - today).days
    
    if days_to_expiry < 0:
        fefo_status = "EXPIRED"
        priority_rank = 999  # Đã quá hạn - Cần cách ly hủy
    elif days_to_expiry <= 7:
        fefo_status = "CRITICAL_NEAR_EXPIRY"
        priority_rank = 1    # Cận hạn khẩn cấp (<= 7 ngày) - Ưu tiên xuất số 1
    elif days_to_expiry <= 30:
        fefo_status = "NEAR_EXPIRY"
        priority_rank = 2    # Cận hạn (<= 30 ngày) - Ưu tiên xuất số 2
    else:
        fefo_status = "GOOD"
        priority_rank = 3    # An toàn dài hạn

    data = {
        "inventory_id": item.inventory_id,
        "item_code": item.item_code,
        "item_name": item.item_name,
        "category": item.category,
        "lot_number": item.lot_number,
        "batch_id": item.batch_id,
        "qr_code": item.qr_code,
        "quantity": float(item.quantity),
        "unit": item.unit,
        "min_stock_level": float(item.min_stock_level),
        "mfg_date": item.mfg_date,
        "exp_date": item.exp_date,
        "warehouse_type": item.warehouse_type,
        "location_bin": item.location_bin,
        "temperature_c": float(item.temperature_c) if item.temperature_c is not None else None,
        "status": item.status,
        "notes": item.notes,
        "days_to_expiry": days_to_expiry,
        "fefo_status": fefo_status,
        "fefo_priority_rank": priority_rank,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }
    return data


def enrich_sample_data(sample: RetainedSample) -> dict:
    today = date.today()
    days_remaining = (sample.expiry_date - today).days
    is_expired = days_remaining < 0

    return {
        "sample_id": sample.sample_id,
        "sample_code": sample.sample_code,
        "batch_id": sample.batch_id,
        "batch_number": sample.batch_number,
        "product_name": sample.product_name,
        "sample_weight_g": float(sample.sample_weight_g),
        "storage_cabinet": sample.storage_cabinet,
        "storage_temperature_c": float(sample.storage_temperature_c) if sample.storage_temperature_c is not None else None,
        "sample_date": sample.sample_date,
        "expiry_date": sample.expiry_date,
        "sampled_by": sample.sampled_by,
        "test_result": sample.test_result,
        "test_details": sample.test_details,
        "status": sample.status,
        "disposed_date": sample.disposed_date,
        "disposed_by": sample.disposed_by,
        "notes": sample.notes,
        "days_remaining": days_remaining,
        "is_expired_storage": is_expired,
        "created_at": sample.created_at,
    }


# =========================================================================
# 1. WAREHOUSE INVENTORY ENDPOINTS (FEFO)
# =========================================================================
@router.get("/stock", response_model=List[WarehouseInventoryResponse])
def get_inventory_stock(
    search: Optional[str] = None,
    category: Optional[str] = None,
    warehouse_type: Optional[str] = None,
    fefo_filter: Optional[str] = None,  # EXPIRED, NEAR_EXPIRY, GOOD
    db: Session = Depends(get_db),
):
    query = db.query(WarehouseInventory)
    
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                WarehouseInventory.item_code.ilike(s),
                WarehouseInventory.item_name.ilike(s),
                WarehouseInventory.lot_number.ilike(s),
                WarehouseInventory.location_bin.ilike(s),
                WarehouseInventory.qr_code.ilike(s),
            )
        )
    
    if category and category != "ALL":
        query = query.filter(WarehouseInventory.category == category)
    
    if warehouse_type and warehouse_type != "ALL":
        query = query.filter(WarehouseInventory.warehouse_type == warehouse_type)

    # Sắp xếp theo FEFO: HSD gần nhất lên trước (exp_date.asc())
    items = query.order_by(WarehouseInventory.exp_date.asc(), WarehouseInventory.created_at.desc()).all()
    
    results = [enrich_inventory_fefo(item) for item in items]
    
    if fefo_filter and fefo_filter != "ALL":
        if fefo_filter == "EXPIRED":
            results = [r for r in results if r["fefo_status"] == "EXPIRED"]
        elif fefo_filter == "NEAR_EXPIRY":
            results = [r for r in results if r["fefo_status"] in ["CRITICAL_NEAR_EXPIRY", "NEAR_EXPIRY"]]
        elif fefo_filter == "GOOD":
            results = [r for r in results if r["fefo_status"] == "GOOD"]

    return results


@router.post("/stock", response_model=WarehouseInventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_item(item_in: WarehouseInventoryCreate, db: Session = Depends(get_db)):
    # Tự động tạo mã QR nếu chưa có
    qr_code = item_in.qr_code or f"QR-{item_in.lot_number}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Kiểm tra trùng QR
    exist_qr = db.query(WarehouseInventory).filter(WarehouseInventory.qr_code == qr_code).first()
    if exist_qr:
        qr_code = f"QR-{item_in.lot_number}-{uuid.uuid4().hex[:6].upper()}"

    new_item = WarehouseInventory(
        item_code=item_in.item_code,
        item_name=item_in.item_name,
        category=item_in.category,
        lot_number=item_in.lot_number,
        batch_id=item_in.batch_id,
        qr_code=qr_code,
        quantity=item_in.quantity,
        unit=item_in.unit,
        min_stock_level=item_in.min_stock_level,
        mfg_date=item_in.mfg_date,
        exp_date=item_in.exp_date,
        warehouse_type=item_in.warehouse_type,
        location_bin=item_in.location_bin,
        temperature_c=item_in.temperature_c,
        status=item_in.status,
        notes=item_in.notes,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return enrich_inventory_fefo(new_item)


@router.put("/stock/{inventory_id}", response_model=WarehouseInventoryResponse)
def update_inventory_item(inventory_id: uuid.UUID, item_in: WarehouseInventoryUpdate, db: Session = Depends(get_db)):
    item = db.query(WarehouseInventory).filter(WarehouseInventory.inventory_id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục tồn kho này")

    update_data = item_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(item, field, val)

    # Validate dates
    if item.exp_date < item.mfg_date:
        raise HTTPException(status_code=400, detail="Hạn sử dụng không được nhỏ hơn ngày sản xuất")

    db.commit()
    db.refresh(item)
    return enrich_inventory_fefo(item)


@router.delete("/stock/{inventory_id}", status_code=status.HTTP_200_OK)
def delete_inventory_item(inventory_id: uuid.UUID, db: Session = Depends(get_db)):
    item = db.query(WarehouseInventory).filter(WarehouseInventory.inventory_id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục tồn kho này")
    db.delete(item)
    db.commit()
    return {"message": "Đã xóa mục tồn kho thành công", "inventory_id": str(inventory_id)}


# =========================================================================
# 2. RETAINED SAMPLES ENDPOINTS
# =========================================================================
@router.get("/samples", response_model=List[RetainedSampleResponse])
def get_retained_samples(
    search: Optional[str] = None,
    cabinet: Optional[str] = None,
    status_filter: Optional[str] = None,
    test_result: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(RetainedSample)
    
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                RetainedSample.sample_code.ilike(s),
                RetainedSample.batch_number.ilike(s),
                RetainedSample.product_name.ilike(s),
                RetainedSample.sampled_by.ilike(s),
            )
        )

    if cabinet and cabinet != "ALL":
        query = query.filter(RetainedSample.storage_cabinet == cabinet)

    if status_filter and status_filter != "ALL":
        query = query.filter(RetainedSample.status == status_filter)

    if test_result and test_result != "ALL":
        query = query.filter(RetainedSample.test_result == test_result)

    samples = query.order_by(RetainedSample.sample_date.desc(), RetainedSample.created_at.desc()).all()
    return [enrich_sample_data(s) for s in samples]


@router.post("/samples", response_model=RetainedSampleResponse, status_code=status.HTTP_201_CREATED)
def create_retained_sample(sample_in: RetainedSampleCreate, db: Session = Depends(get_db)):
    exist = db.query(RetainedSample).filter(RetainedSample.sample_code == sample_in.sample_code).first()
    if exist:
        raise HTTPException(status_code=400, detail=f"Mã mẫu lưu {sample_in.sample_code} đã tồn tại!")

    new_sample = RetainedSample(
        sample_code=sample_in.sample_code,
        batch_id=sample_in.batch_id,
        batch_number=sample_in.batch_number,
        product_name=sample_in.product_name,
        sample_weight_g=sample_in.sample_weight_g,
        storage_cabinet=sample_in.storage_cabinet,
        storage_temperature_c=sample_in.storage_temperature_c,
        sample_date=sample_in.sample_date,
        expiry_date=sample_in.expiry_date,
        sampled_by=sample_in.sampled_by,
        test_result=sample_in.test_result,
        test_details=sample_in.test_details,
        status=sample_in.status,
        disposed_date=sample_in.disposed_date,
        disposed_by=sample_in.disposed_by,
        notes=sample_in.notes,
    )
    db.add(new_sample)
    db.commit()
    db.refresh(new_sample)
    return enrich_sample_data(new_sample)


@router.put("/samples/{sample_id}", response_model=RetainedSampleResponse)
def update_retained_sample(sample_id: uuid.UUID, sample_in: RetainedSampleUpdate, db: Session = Depends(get_db)):
    sample = db.query(RetainedSample).filter(RetainedSample.sample_id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu lưu này")

    update_data = sample_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(sample, field, val)

    db.commit()
    db.refresh(sample)
    return enrich_sample_data(sample)


@router.delete("/samples/{sample_id}", status_code=status.HTTP_200_OK)
def delete_retained_sample(sample_id: uuid.UUID, db: Session = Depends(get_db)):
    sample = db.query(RetainedSample).filter(RetainedSample.sample_id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu lưu này")
    db.delete(sample)
    db.commit()
    return {"message": "Đã xóa mẫu lưu thành công", "sample_id": str(sample_id)}


# =========================================================================
# 3. PRODUCTION BATCHES ENDPOINTS
# =========================================================================
@router.get("/batches", response_model=List[ProductionBatchResponse])
def get_production_batches(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ProductionBatch).options(
        joinedload(ProductionBatch.material_usages)
    )

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                ProductionBatch.batch_number.ilike(s),
                ProductionBatch.product_name.ilike(s),
                ProductionBatch.production_line.ilike(s),
            )
        )

    if status_filter and status_filter != "ALL":
        query = query.filter(ProductionBatch.status == status_filter)

    batches = query.order_by(ProductionBatch.start_time.desc()).all()

    # Đếm ccp_logs_count
    results = []
    for b in batches:
        ccp_count = db.query(func.count(CCPMonitoringLog.log_id)).filter(
            CCPMonitoringLog.batch_number == b.batch_number
        ).scalar() or 0

        usages_res = []
        for u in b.material_usages:
            usages_res.append(
                BatchMaterialUsageResponse(
                    usage_id=u.usage_id,
                    material_lot_id=u.material_lot_id,
                    material_name=u.material_name,
                    lot_number=u.lot_number,
                    quantity_used=float(u.quantity_used),
                    unit=u.unit,
                    recorded_at=u.recorded_at,
                )
            )

        results.append(
            ProductionBatchResponse(
                batch_id=b.batch_id,
                batch_number=b.batch_number,
                product_name=b.product_name,
                product_code=b.product_code,
                production_line=b.production_line,
                shift=b.shift,
                planned_quantity=float(b.planned_quantity),
                actual_quantity=float(b.actual_quantity),
                unit=b.unit,
                start_time=b.start_time,
                end_time=b.end_time,
                status=b.status,
                qc_inspector=b.qc_inspector,
                notes=b.notes,
                material_usages=usages_res,
                ccp_logs_count=ccp_count,
                created_at=b.created_at,
            )
        )

    return results


@router.post("/batches", response_model=ProductionBatchResponse, status_code=status.HTTP_201_CREATED)
def create_production_batch(batch_in: ProductionBatchCreate, db: Session = Depends(get_db)):
    exist = db.query(ProductionBatch).filter(ProductionBatch.batch_number == batch_in.batch_number).first()
    if exist:
        raise HTTPException(status_code=400, detail=f"Mã mẻ sản xuất {batch_in.batch_number} đã tồn tại!")

    new_batch = ProductionBatch(
        batch_number=batch_in.batch_number,
        product_name=batch_in.product_name,
        product_code=batch_in.product_code,
        production_line=batch_in.production_line,
        shift=batch_in.shift,
        planned_quantity=batch_in.planned_quantity,
        actual_quantity=batch_in.actual_quantity,
        unit=batch_in.unit,
        start_time=batch_in.start_time,
        end_time=batch_in.end_time,
        status=batch_in.status,
        qc_inspector=batch_in.qc_inspector,
        notes=batch_in.notes,
    )
    db.add(new_batch)
    db.flush()

    # Thêm chi tiết nguyên liệu sử dụng nếu có
    if batch_in.materials:
        for mat in batch_in.materials:
            usage = BatchMaterialUsage(
                batch_id=new_batch.batch_id,
                material_lot_id=mat.material_lot_id,
                material_name=mat.material_name,
                lot_number=mat.lot_number,
                quantity_used=mat.quantity_used,
                unit=mat.unit,
            )
            db.add(usage)

    db.commit()
    db.refresh(new_batch)
    return get_production_batches(search=new_batch.batch_number, db=db)[0]


# =========================================================================
# 4. ORDER DISPATCHES ENDPOINTS
# =========================================================================
@router.get("/dispatches", response_model=List[OrderDispatchResponse])
def get_order_dispatches(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(OrderDispatch)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                OrderDispatch.dispatch_code.ilike(s),
                OrderDispatch.order_number.ilike(s),
                OrderDispatch.customer_name.ilike(s),
                OrderDispatch.batch_number.ilike(s),
                OrderDispatch.vehicle_number.ilike(s),
            )
        )

    if status_filter and status_filter != "ALL":
        query = query.filter(OrderDispatch.status == status_filter)

    dispatches = query.order_by(OrderDispatch.dispatched_at.desc()).all()
    
    results = []
    for d in dispatches:
        results.append(
            OrderDispatchResponse(
                dispatch_id=d.dispatch_id,
                dispatch_code=d.dispatch_code,
                order_number=d.order_number,
                customer_name=d.customer_name,
                customer_phone=d.customer_phone,
                destination_address=d.destination_address,
                batch_id=d.batch_id,
                batch_number=d.batch_number,
                product_name=d.product_name,
                quantity_dispatched=float(d.quantity_dispatched),
                unit=d.unit,
                vehicle_number=d.vehicle_number,
                vehicle_temp_c=float(d.vehicle_temp_c) if d.vehicle_temp_c is not None else None,
                vehicle_check_status=d.vehicle_check_status,
                status=d.status,
                notes=d.notes,
                dispatched_at=d.dispatched_at,
                dispatcher_name=d.dispatcher.full_name if d.dispatcher else None,
            )
        )
    return results


@router.post("/dispatches", response_model=OrderDispatchResponse, status_code=status.HTTP_201_CREATED)
def create_order_dispatch(dispatch_in: OrderDispatchCreate, db: Session = Depends(get_db)):
    exist = db.query(OrderDispatch).filter(OrderDispatch.dispatch_code == dispatch_in.dispatch_code).first()
    if exist:
        raise HTTPException(status_code=400, detail=f"Mã phiếu xuất {dispatch_in.dispatch_code} đã tồn tại!")

    new_d = OrderDispatch(
        dispatch_code=dispatch_in.dispatch_code,
        order_number=dispatch_in.order_number,
        customer_name=dispatch_in.customer_name,
        customer_phone=dispatch_in.customer_phone,
        destination_address=dispatch_in.destination_address,
        batch_id=dispatch_in.batch_id,
        batch_number=dispatch_in.batch_number,
        product_name=dispatch_in.product_name,
        quantity_dispatched=dispatch_in.quantity_dispatched,
        unit=dispatch_in.unit,
        vehicle_number=dispatch_in.vehicle_number,
        vehicle_temp_c=dispatch_in.vehicle_temp_c,
        vehicle_check_status=dispatch_in.vehicle_check_status,
        status=dispatch_in.status,
        notes=dispatch_in.notes,
    )
    db.add(new_d)
    db.commit()
    db.refresh(new_d)
    return get_order_dispatches(search=new_d.dispatch_code, db=db)[0]


# =========================================================================
# 5. KPI SUMMARY STATS FOR INVENTORY
# =========================================================================
@router.get("/kpi-stats")
def get_inventory_kpi_stats(db: Session = Depends(get_db)):
    today = date.today()
    
    total_stock_items = db.query(func.count(WarehouseInventory.inventory_id)).scalar() or 0
    total_quantity = db.query(func.sum(WarehouseInventory.quantity)).scalar() or 0
    
    # FEFO stats
    expired_count = db.query(func.count(WarehouseInventory.inventory_id)).filter(
        WarehouseInventory.exp_date < today
    ).scalar() or 0
    
    near_expiry_count = db.query(func.count(WarehouseInventory.inventory_id)).filter(
        and_(
            WarehouseInventory.exp_date >= today,
            WarehouseInventory.exp_date <= today + timedelta(days=30),
        )
    ).scalar() or 0

    total_samples = db.query(func.count(RetainedSample.sample_id)).scalar() or 0
    active_samples = db.query(func.count(RetainedSample.sample_id)).filter(
        RetainedSample.status == "STORED"
    ).scalar() or 0

    total_batches = db.query(func.count(ProductionBatch.batch_id)).scalar() or 0
    total_dispatches = db.query(func.count(OrderDispatch.dispatch_id)).scalar() or 0

    return {
        "total_stock_items": total_stock_items,
        "total_stock_quantity": float(total_quantity),
        "expired_items": expired_count,
        "near_expiry_items": near_expiry_count,
        "total_retained_samples": total_samples,
        "active_retained_samples": active_samples,
        "total_production_batches": total_batches,
        "total_order_dispatches": total_dispatches,
    }
