"""Dọn dữ liệu nghiệp vụ/demo để chuẩn bị môi trường production.

Mặc định chỉ in số lượng bản ghi sẽ bị xóa. Phải truyền ``--execute`` mới chạy
TRUNCATE. Tài khoản, vai trò, phân quyền và phòng ban được giữ lại để đội ngũ
vẫn đăng nhập, phân quyền và bắt đầu nhập dữ liệu thật được.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from sqlalchemy import text

from app.core.database import SessionLocal


# Không bao gồm users, roles, user_roles và departments vì đây là dữ liệu nền.
BUSINESS_TABLES = (
    "user_read_alerts", "audit_logs", "document_approvals", "document_distributions",
    "document_change_requests", "external_documents", "records_retention", "documents",
    "supplier_evaluations", "supplier_evaluation_plans", "iqc_inspections", "material_lots", "suppliers",
    "ccp_monitoring_logs", "ccp_definitions", "hazard_analyses", "haccp_plan_reviews", "process_steps", "haccp_plans",
    "prp_checklist_logs", "prp_programs", "metal_detector_logs", "in_process_qc_logs", "pest_control_logs",
    "allergen_controls", "visitor_health_declarations", "first_aid_logs", "water_safety_records", "chemical_records",
    "waste_logs", "environmental_monitoring_schedules", "equipment_calibration_logs", "equipment_maintenance_logs", "equipments",
    "disposal_records", "vehicle_inspection_logs", "vehicle_inspections", "order_dispatches", "retained_samples",
    "warehouse_inventory", "batch_material_usage", "production_batches", "capa_records", "non_conformances",
    "audit_findings", "internal_audits", "training_evaluations", "training_participant_records", "training_requests",
    "training_courses", "health_declaration_records", "quality_objectives", "management_reviews", "emergency_drills",
    "emergency_procedures", "emergency_contacts", "dynamic_form_submissions", "workflow_instances",
    "dynamic_form_templates", "dynamic_workflow_templates", "change_requests", "communications_log", "context_risks",
    "interested_parties", "food_safety_team_members",
)


def get_counts(db) -> dict[str, int]:
    return {
        table: db.execute(text(f'SELECT count(*) FROM "{table}"')).scalar_one()
        for table in BUSINESS_TABLES
    }


def remove_demo_uploads() -> int:
    """Remove importer-created files only; never remove manually uploaded files."""
    upload_dir = Path(__file__).resolve().parents[1] / "uploads" / "documents"
    if not upload_dir.is_dir():
        return 0
    removed = 0
    for file_path in upload_dir.glob("angiang_*"):
        if file_path.is_file():
            file_path.unlink()
            removed += 1
    return removed


def cleanup_sample_data(execute: bool = False) -> int:
    db = SessionLocal()
    try:
        counts = get_counts(db)
        total = sum(counts.values())
        print(f"[CLEANUP] Có {total} bản ghi nghiệp vụ sẽ bị xóa.")
        for table, count in counts.items():
            if count:
                print(f"  - {table}: {count}")

        if not execute:
            print("[CLEANUP] Chế độ xem trước. Chạy lại với --execute để xóa.")
            return total

        quoted_tables = ", ".join(f'"{table}"' for table in BUSINESS_TABLES)
        db.execute(text(f"TRUNCATE TABLE {quoted_tables} RESTART IDENTITY CASCADE"))
        db.commit()
        removed_files = remove_demo_uploads()
        remaining = sum(get_counts(db).values())
        if remaining:
            raise RuntimeError(f"Dọn dữ liệu chưa hoàn tất, còn {remaining} bản ghi nghiệp vụ")
        print(
            "[CLEANUP] Hoàn tất: đã xóa dữ liệu nghiệp vụ/demo, giữ users/roles/"
            f"departments và xóa {removed_files} file DMS demo."
        )
        return total
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Dọn dữ liệu demo FSMS")
    parser.add_argument("--execute", action="store_true", help="Xác nhận thực hiện xóa dữ liệu")
    args = parser.parse_args()
    cleanup_sample_data(execute=args.execute)
