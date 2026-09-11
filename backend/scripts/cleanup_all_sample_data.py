"""
Script dọn dẹp sạch toàn bộ dữ liệu mẫu nghiệp vụ ISO 22000.
Bảo lưu tài khoản quản trị (Users), Vai trò (Roles) và Phòng ban (Departments) để đăng nhập và phân quyền.
"""

from app.core.database import SessionLocal
from app.modules.organization.models import FoodSafetyTeamMember, InterestedParty, ContextRisk, CommunicationLog
from app.modules.purchasing.models import Supplier, MaterialLot, IQCInspection
from app.modules.equipment.models import Equipment, EquipmentMaintenanceLog, EquipmentCalibrationLog
from app.modules.emergency.models import EmergencyContact, EmergencyProcedure, EmergencyDrill
from app.modules.audits.models import InternalAudit, AuditFinding, TrainingCourse, TrainingParticipantRecord, HealthDeclarationRecord
from app.modules.capa.models import NonConformance, CAPARecord
from app.modules.dashboard.models import QualityObjective, ManagementReview
from app.modules.haccp.models import (
    HACCPPlan, HACCPPlanReview, ProcessStep, HazardAnalysis, CCPDefinition, CCPMonitoringLog,
    PRPProgram, PRPChecklistLog
)
from app.modules.documents.models import Document
from app.modules.builder.models import (
    DynamicFormTemplate, DynamicFormSubmission, DynamicWorkflowTemplate, WorkflowInstance
)
from app.modules.change_management.models import ChangeRequest
from app.modules.inventory.models import (
    ProductionBatch, BatchMaterialUsage, WarehouseInventory, RetainedSample, OrderDispatch,
    VehicleInspection, DisposalRecord
)

def cleanup_sample_data():
    db = SessionLocal()
    try:
        print("[CLEANUP] Bắt đầu dọn dẹp sạch toàn bộ dữ liệu mẫu nghiệp vụ...")

        # 1. Inventory & Traceability
        db.query(DisposalRecord).delete()
        db.query(VehicleInspection).delete()
        db.query(OrderDispatch).delete()
        db.query(RetainedSample).delete()
        db.query(WarehouseInventory).delete()
        db.query(BatchMaterialUsage).delete()
        db.query(ProductionBatch).delete()

        # 2. HACCP & OPRP/CCP & PRP
        db.query(CCPMonitoringLog).delete()
        db.query(CCPDefinition).delete()
        db.query(HazardAnalysis).delete()
        db.query(PRPChecklistLog).delete()
        db.query(PRPProgram).delete()
        db.query(ProcessStep).delete()
        db.query(HACCPPlanReview).delete()
        db.query(HACCPPlan).delete()

        # 3. CAPA & Non-Conformance
        db.query(CAPARecord).delete()
        db.query(NonConformance).delete()

        # 4. Audits & Training & Health
        db.query(AuditFinding).delete()
        db.query(InternalAudit).delete()
        db.query(TrainingParticipantRecord).delete()
        db.query(TrainingCourse).delete()
        db.query(HealthDeclarationRecord).delete()

        # 5. Equipment Maintenance & Calibration
        db.query(EquipmentMaintenanceLog).delete()
        db.query(EquipmentCalibrationLog).delete()
        db.query(Equipment).delete()

        # 6. Emergency & Incidents
        db.query(EmergencyDrill).delete()
        db.query(EmergencyProcedure).delete()
        db.query(EmergencyContact).delete()

        # 7. Purchasing & IQC
        db.query(IQCInspection).delete()
        db.query(MaterialLot).delete()
        db.query(Supplier).delete()

        # 8. Documents & Changes
        db.query(Document).delete()
        db.query(ChangeRequest).delete()

        # 9. Dashboard Objectives & Reviews
        db.query(QualityObjective).delete()
        db.query(ManagementReview).delete()

        # 10. Organization (Context, Parties, FST)
        db.query(CommunicationLog).delete()
        db.query(ContextRisk).delete()
        db.query(InterestedParty).delete()
        db.query(FoodSafetyTeamMember).delete()

        # 11. Builder Forms & Workflows
        db.query(DynamicFormSubmission).delete()
        db.query(DynamicFormTemplate).delete()
        db.query(WorkflowInstance).delete()
        db.query(DynamicWorkflowTemplate).delete()

        db.commit()
        print("[CLEANUP] ✅ Đã xóa toàn bộ dữ liệu mẫu nghiệp vụ thành công!")

    except Exception as e:
        db.rollback()
        print(f"[CLEANUP] ❌ Lỗi khi dọn dẹp dữ liệu: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_sample_data()
