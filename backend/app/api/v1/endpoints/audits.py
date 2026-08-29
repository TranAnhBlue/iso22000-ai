import uuid
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_

from app.core.database import get_db
from app.models.audit import (
    InternalAudit,
    AuditFinding,
    TrainingCourse,
    TrainingParticipantRecord,
    HealthDeclarationRecord,
)
from app.models.capa import NonConformance
from app.schemas.audit import (
    InternalAuditCreate,
    InternalAuditUpdate,
    InternalAuditOut,
    AuditFindingCreate,
    AuditFindingUpdate,
    AuditFindingOut,
    TrainingCourseCreate,
    TrainingCourseUpdate,
    TrainingCourseOut,
    TrainingParticipantCreate,
    TrainingParticipantUpdate,
    TrainingParticipantOut,
    HealthDeclarationCreate,
    HealthDeclarationUpdate,
    HealthDeclarationOut,
    AuditStatsOut,
    AIChecklistRequest,
    AIEvaluateFindingRequest,
    AIQuizRequest,
    AIHealthRiskRequest,
)

router = APIRouter()

# ==================== STATS & KPIS ====================
@router.get("/stats", response_model=AuditStatsOut)
def get_audit_stats(db: Session = Depends(get_db)):
    audits = db.query(InternalAudit).all()
    total_audits = len(audits)
    completed_audits = sum(1 for a in audits if a.status in ["COMPLETED", "CLOSED"])
    in_progress_audits = sum(1 for a in audits if a.status == "IN_PROGRESS")
    planned_audits = sum(1 for a in audits if a.status == "PLANNED")

    findings = db.query(AuditFinding).all()
    total_findings = len(findings)
    major_nc_count = sum(1 for f in findings if f.result == "MAJOR_NC")
    minor_nc_count = sum(1 for f in findings if f.result == "MINOR_NC")
    ofi_count = sum(1 for f in findings if f.result == "OFI")
    conformity_count = sum(1 for f in findings if f.result == "CONFORMITY")
    conformity_rate = round((conformity_count / total_findings * 100), 1) if total_findings > 0 else 100.0

    courses = db.query(TrainingCourse).all()
    total_courses = len(courses)
    completed_courses = sum(1 for c in courses if c.status == "COMPLETED")

    participants = db.query(TrainingParticipantRecord).all()
    total_learners = len(participants)
    passed_learners = sum(1 for p in participants if p.evaluation_result == "PASSED")
    passed_rate = round((passed_learners / total_learners * 100), 1) if total_learners > 0 else 100.0

    declarations = db.query(HealthDeclarationRecord).all()
    total_health_declarations = len(declarations)
    today = date.today()
    today_cleared_count = sum(1 for d in declarations if d.shift_date == today and d.cleared_for_shift == "CLEARED")
    today_suspended_count = sum(1 for d in declarations if d.shift_date == today and d.cleared_for_shift == "SUSPENDED")

    return {
        "total_audits": total_audits,
        "completed_audits": completed_audits,
        "in_progress_audits": in_progress_audits,
        "planned_audits": planned_audits,
        "total_findings": total_findings,
        "major_nc_count": major_nc_count,
        "minor_nc_count": minor_nc_count,
        "ofi_count": ofi_count,
        "conformity_rate": conformity_rate,
        "total_courses": total_courses,
        "completed_courses": completed_courses,
        "total_learners": total_learners,
        "passed_rate": passed_rate,
        "total_health_declarations": total_health_declarations,
        "today_cleared_count": today_cleared_count,
        "today_suspended_count": today_suspended_count,
    }


# ==================== INTERNAL AUDITS (CRUD) ====================
@router.get("/audits", response_model=List[InternalAuditOut])
def list_internal_audits(
    status: Optional[str] = None,
    audit_type: Optional[str] = None,
    dept: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(InternalAudit)
    if status and status != "ALL":
        q = q.filter(InternalAudit.status == status)
    if audit_type and audit_type != "ALL":
        q = q.filter(InternalAudit.audit_type == audit_type)
    if dept and dept != "ALL":
        q = q.filter(InternalAudit.audited_dept == dept)
    
    audits = q.order_by(desc(InternalAudit.start_date)).all()
    res = []
    for a in audits:
        findings = db.query(AuditFinding).filter(AuditFinding.audit_id == a.audit_id).all()
        res.append(
            InternalAuditOut(
                audit_id=a.audit_id,
                audit_code=a.audit_code,
                title=a.title,
                audit_type=a.audit_type,
                start_date=a.start_date,
                end_date=a.end_date,
                lead_auditor_name=a.lead_auditor_name,
                lead_auditor_id=a.lead_auditor_id,
                auditor_team=a.auditor_team or [],
                audited_dept=a.audited_dept,
                audited_lead_name=a.audited_lead_name,
                scope=a.scope,
                standard_clauses=a.standard_clauses or [],
                findings_summary=a.findings_summary,
                conclusion=a.conclusion,
                status=a.status,
                created_at=a.created_at,
                total_findings=len(findings),
                conformity_count=sum(1 for f in findings if f.result == "CONFORMITY"),
                major_nc_count=sum(1 for f in findings if f.result == "MAJOR_NC"),
                minor_nc_count=sum(1 for f in findings if f.result == "MINOR_NC"),
                ofi_count=sum(1 for f in findings if f.result == "OFI"),
            )
        )
    return res


@router.post("/audits", response_model=InternalAuditOut)
def create_internal_audit(payload: InternalAuditCreate, db: Session = Depends(get_db)):
    existing = db.query(InternalAudit).filter(InternalAudit.audit_code == payload.audit_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã đợt đánh giá {payload.audit_code} đã tồn tại!")

    audit = InternalAudit(
        audit_code=payload.audit_code,
        title=payload.title,
        audit_type=payload.audit_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        lead_auditor_name=payload.lead_auditor_name,
        lead_auditor_id=payload.lead_auditor_id,
        auditor_team=payload.auditor_team or [],
        audited_dept=payload.audited_dept,
        audited_lead_name=payload.audited_lead_name,
        scope=payload.scope,
        standard_clauses=payload.standard_clauses or [],
        findings_summary=payload.findings_summary,
        conclusion=payload.conclusion,
        status=payload.status,
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return InternalAuditOut(
        audit_id=audit.audit_id,
        audit_code=audit.audit_code,
        title=audit.title,
        audit_type=audit.audit_type,
        start_date=audit.start_date,
        end_date=audit.end_date,
        lead_auditor_name=audit.lead_auditor_name,
        lead_auditor_id=audit.lead_auditor_id,
        auditor_team=audit.auditor_team or [],
        audited_dept=audit.audited_dept,
        audited_lead_name=audit.audited_lead_name,
        scope=audit.scope,
        standard_clauses=audit.standard_clauses or [],
        findings_summary=audit.findings_summary,
        conclusion=audit.conclusion,
        status=audit.status,
        created_at=audit.created_at,
        total_findings=0,
        conformity_count=0,
        major_nc_count=0,
        minor_nc_count=0,
        ofi_count=0,
    )


@router.get("/audits/{audit_id}", response_model=InternalAuditOut)
def get_internal_audit(audit_id: uuid.UUID, db: Session = Depends(get_db)):
    audit = db.query(InternalAudit).filter(InternalAudit.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt đánh giá!")
    findings = db.query(AuditFinding).filter(AuditFinding.audit_id == audit.audit_id).all()
    return InternalAuditOut(
        audit_id=audit.audit_id,
        audit_code=audit.audit_code,
        title=audit.title,
        audit_type=audit.audit_type,
        start_date=audit.start_date,
        end_date=audit.end_date,
        lead_auditor_name=audit.lead_auditor_name,
        lead_auditor_id=audit.lead_auditor_id,
        auditor_team=audit.auditor_team or [],
        audited_dept=audit.audited_dept,
        audited_lead_name=audit.audited_lead_name,
        scope=audit.scope,
        standard_clauses=audit.standard_clauses or [],
        findings_summary=audit.findings_summary,
        conclusion=audit.conclusion,
        status=audit.status,
        created_at=audit.created_at,
        total_findings=len(findings),
        conformity_count=sum(1 for f in findings if f.result == "CONFORMITY"),
        major_nc_count=sum(1 for f in findings if f.result == "MAJOR_NC"),
        minor_nc_count=sum(1 for f in findings if f.result == "MINOR_NC"),
        ofi_count=sum(1 for f in findings if f.result == "OFI"),
    )


@router.put("/audits/{audit_id}", response_model=InternalAuditOut)
def update_internal_audit(audit_id: uuid.UUID, payload: InternalAuditUpdate, db: Session = Depends(get_db)):
    audit = db.query(InternalAudit).filter(InternalAudit.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt đánh giá!")
    
    update_data = payload.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(audit, k, v)
    db.commit()
    db.refresh(audit)

    findings = db.query(AuditFinding).filter(AuditFinding.audit_id == audit.audit_id).all()
    return InternalAuditOut(
        audit_id=audit.audit_id,
        audit_code=audit.audit_code,
        title=audit.title,
        audit_type=audit.audit_type,
        start_date=audit.start_date,
        end_date=audit.end_date,
        lead_auditor_name=audit.lead_auditor_name,
        lead_auditor_id=audit.lead_auditor_id,
        auditor_team=audit.auditor_team or [],
        audited_dept=audit.audited_dept,
        audited_lead_name=audit.audited_lead_name,
        scope=audit.scope,
        standard_clauses=audit.standard_clauses or [],
        findings_summary=audit.findings_summary,
        conclusion=audit.conclusion,
        status=audit.status,
        created_at=audit.created_at,
        total_findings=len(findings),
        conformity_count=sum(1 for f in findings if f.result == "CONFORMITY"),
        major_nc_count=sum(1 for f in findings if f.result == "MAJOR_NC"),
        minor_nc_count=sum(1 for f in findings if f.result == "MINOR_NC"),
        ofi_count=sum(1 for f in findings if f.result == "OFI"),
    )


@router.delete("/audits/{audit_id}")
def delete_internal_audit(audit_id: uuid.UUID, db: Session = Depends(get_db)):
    audit = db.query(InternalAudit).filter(InternalAudit.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt đánh giá!")
    db.delete(audit)
    db.commit()
    return {"message": "Đã xóa đợt đánh giá nội bộ thành công"}


# ==================== AUDIT FINDINGS (CRUD) ====================
@router.get("/audits/{audit_id}/findings", response_model=List[AuditFindingOut])
def list_audit_findings(audit_id: uuid.UUID, db: Session = Depends(get_db)):
    findings = db.query(AuditFinding).filter(AuditFinding.audit_id == audit_id).order_by(AuditFinding.clause_number).all()
    res = []
    for f in findings:
        nc = None
        if f.linked_nc_id:
            nc = db.query(NonConformance).filter(NonConformance.nc_id == f.linked_nc_id).first()
        res.append(
            AuditFindingOut(
                finding_id=f.finding_id,
                audit_id=f.audit_id,
                clause_number=f.clause_number,
                clause_title=f.clause_title,
                department=f.department,
                question=f.question,
                evidence_reviewed=f.evidence_reviewed,
                result=f.result,
                finding_notes=f.finding_notes,
                linked_nc_id=f.linked_nc_id,
                created_at=f.created_at,
                nc_number=nc.nc_number if nc else None,
                nc_status=nc.status if nc else None,
            )
        )
    return res


@router.post("/audits/{audit_id}/findings", response_model=AuditFindingOut)
def create_audit_finding(audit_id: uuid.UUID, payload: AuditFindingCreate, db: Session = Depends(get_db)):
    audit = db.query(InternalAudit).filter(InternalAudit.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt đánh giá!")
    
    finding = AuditFinding(
        audit_id=audit_id,
        clause_number=payload.clause_number,
        clause_title=payload.clause_title,
        department=payload.department,
        question=payload.question,
        evidence_reviewed=payload.evidence_reviewed,
        result=payload.result,
        finding_notes=payload.finding_notes,
        linked_nc_id=payload.linked_nc_id,
    )
    db.add(finding)
    db.commit()
    db.refresh(finding)
    return AuditFindingOut.from_orm(finding)


@router.put("/findings/{finding_id}", response_model=AuditFindingOut)
def update_audit_finding(finding_id: uuid.UUID, payload: AuditFindingUpdate, db: Session = Depends(get_db)):
    finding = db.query(AuditFinding).filter(AuditFinding.finding_id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Không tìm thấy phát hiện đánh giá!")
    
    update_data = payload.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(finding, k, v)
    db.commit()
    db.refresh(finding)

    nc = None
    if finding.linked_nc_id:
        nc = db.query(NonConformance).filter(NonConformance.nc_id == finding.linked_nc_id).first()
    
    return AuditFindingOut(
        finding_id=finding.finding_id,
        audit_id=finding.audit_id,
        clause_number=finding.clause_number,
        clause_title=finding.clause_title,
        department=finding.department,
        question=finding.question,
        evidence_reviewed=finding.evidence_reviewed,
        result=finding.result,
        finding_notes=finding.finding_notes,
        linked_nc_id=finding.linked_nc_id,
        created_at=finding.created_at,
        nc_number=nc.nc_number if nc else None,
        nc_status=nc.status if nc else None,
    )


@router.delete("/findings/{finding_id}")
def delete_audit_finding(finding_id: uuid.UUID, db: Session = Depends(get_db)):
    finding = db.query(AuditFinding).filter(AuditFinding.finding_id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Không tìm thấy phát hiện đánh giá!")
    db.delete(finding)
    db.commit()
    return {"message": "Đã xóa phát hiện đánh giá"}


# ==================== 1-CLICK CONVERT FINDING TO NC IN CAPA ====================
@router.post("/findings/{finding_id}/convert-to-nc")
def convert_finding_to_nc(finding_id: uuid.UUID, db: Session = Depends(get_db)):
    finding = db.query(AuditFinding).filter(AuditFinding.finding_id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Không tìm thấy phát hiện đánh giá!")
    
    if finding.linked_nc_id:
        existing_nc = db.query(NonConformance).filter(NonConformance.nc_id == finding.linked_nc_id).first()
        if existing_nc:
            return {
                "message": f"Phát hiện này đã được liên kết với phiếu NC {existing_nc.nc_number}",
                "nc_id": str(existing_nc.nc_id),
                "nc_number": existing_nc.nc_number,
            }

    audit = db.query(InternalAudit).filter(InternalAudit.audit_id == finding.audit_id).first()
    audit_code = audit.audit_code if audit else "IA-AUDIT"

    count_ncs = db.query(NonConformance).count()
    nc_num = f"NC-{datetime.utcnow().strftime('%Y')}-{(count_ncs + 1):03d}"
    severity = "CRITICAL" if finding.result == "MAJOR_NC" else "MAJOR" if finding.result == "MINOR_NC" else "MINOR"

    new_nc = NonConformance(
        nc_number=nc_num,
        title=f"[{audit_code} - Điều {finding.clause_number}] {finding.clause_title}",
        source="INTERNAL_AUDIT",
        severity=severity,
        occurred_date=date.today(),
        occurred_location=finding.department,
        description=f"Phát hiện trong đợt đánh giá nội bộ {audit_code}:\n- Câu hỏi/Yêu cầu: {finding.question}\n- Bằng chứng xem xét: {finding.evidence_reviewed or 'Chưa ghi nhận'}\n- Chi tiết sai lệch: {finding.finding_notes or 'Không phù hợp tiêu chuẩn'}",
        immediate_action="Lập biên bản ghi nhận tại chỗ, yêu cầu trưởng phòng ban liên quan lập kế hoạch khắc phục CAPA theo ISO 22000 Điều khoản 10.1.",
        reported_by_name=audit.lead_auditor_name if audit else "Đoàn Đánh Giá Nội Bộ",
        status="NEW",
    )
    db.add(new_nc)
    db.flush()

    finding.linked_nc_id = new_nc.nc_id
    db.commit()

    return {
        "message": f"Đã chuyển đổi phát hiện thành công sang Phiếu NC {nc_num}",
        "nc_id": str(new_nc.nc_id),
        "nc_number": new_nc.nc_number,
        "severity": new_nc.severity,
    }


# ==================== TRAINING COURSES (CRUD) ====================
@router.get("/training/courses", response_model=List[TrainingCourseOut])
def list_training_courses(
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(TrainingCourse)
    if category and category != "ALL":
        q = q.filter(TrainingCourse.category == category)
    if status and status != "ALL":
        q = q.filter(TrainingCourse.status == status)
    
    courses = q.order_by(desc(TrainingCourse.schedule_date)).all()
    res = []
    for c in courses:
        parts = db.query(TrainingParticipantRecord).filter(TrainingParticipantRecord.course_id == c.course_id).all()
        total_p = len(parts)
        passed_p = sum(1 for p in parts if p.evaluation_result == "PASSED")
        scores = [float(p.post_test_score) for p in parts if p.post_test_score is not None]
        avg_s = round(sum(scores) / len(scores), 1) if scores else 0.0

        res.append(
            TrainingCourseOut(
                course_id=c.course_id,
                course_code=c.course_code,
                title=c.title,
                category=c.category,
                trainer_name=c.trainer_name,
                training_type=c.training_type,
                schedule_date=c.schedule_date,
                duration_hours=float(c.duration_hours),
                target_dept=c.target_dept,
                content_summary=c.content_summary,
                status=c.status,
                created_at=c.created_at,
                total_participants=total_p,
                passed_participants=passed_p,
                avg_score=avg_s,
            )
        )
    return res


@router.post("/training/courses", response_model=TrainingCourseOut)
def create_training_course(payload: TrainingCourseCreate, db: Session = Depends(get_db)):
    existing = db.query(TrainingCourse).filter(TrainingCourse.course_code == payload.course_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã khóa học {payload.course_code} đã tồn tại!")
    
    course = TrainingCourse(
        course_code=payload.course_code,
        title=payload.title,
        category=payload.category,
        trainer_name=payload.trainer_name,
        training_type=payload.training_type,
        schedule_date=payload.schedule_date,
        duration_hours=payload.duration_hours,
        target_dept=payload.target_dept,
        content_summary=payload.content_summary,
        status=payload.status,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return TrainingCourseOut(
        course_id=course.course_id,
        course_code=course.course_code,
        title=course.title,
        category=course.category,
        trainer_name=course.trainer_name,
        training_type=course.training_type,
        schedule_date=course.schedule_date,
        duration_hours=float(course.duration_hours),
        target_dept=course.target_dept,
        content_summary=course.content_summary,
        status=course.status,
        created_at=course.created_at,
        total_participants=0,
        passed_participants=0,
        avg_score=0.0,
    )


@router.put("/training/courses/{course_id}", response_model=TrainingCourseOut)
def update_training_course(course_id: uuid.UUID, payload: TrainingCourseUpdate, db: Session = Depends(get_db)):
    course = db.query(TrainingCourse).filter(TrainingCourse.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa đào tạo!")
    
    update_data = payload.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(course, k, v)
    db.commit()
    db.refresh(course)

    parts = db.query(TrainingParticipantRecord).filter(TrainingParticipantRecord.course_id == course.course_id).all()
    total_p = len(parts)
    passed_p = sum(1 for p in parts if p.evaluation_result == "PASSED")
    scores = [float(p.post_test_score) for p in parts if p.post_test_score is not None]
    avg_s = round(sum(scores) / len(scores), 1) if scores else 0.0

    return TrainingCourseOut(
        course_id=course.course_id,
        course_code=course.course_code,
        title=course.title,
        category=course.category,
        trainer_name=course.trainer_name,
        training_type=course.training_type,
        schedule_date=course.schedule_date,
        duration_hours=float(course.duration_hours),
        target_dept=course.target_dept,
        content_summary=course.content_summary,
        status=course.status,
        created_at=course.created_at,
        total_participants=total_p,
        passed_participants=passed_p,
        avg_score=avg_s,
    )


@router.delete("/training/courses/{course_id}")
def delete_training_course(course_id: uuid.UUID, db: Session = Depends(get_db)):
    course = db.query(TrainingCourse).filter(TrainingCourse.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa đào tạo!")
    db.delete(course)
    db.commit()
    return {"message": "Đã xóa khóa đào tạo thành công"}


# ==================== TRAINING PARTICIPANTS (CRUD) ====================
@router.get("/training/courses/{course_id}/participants", response_model=List[TrainingParticipantOut])
def list_course_participants(course_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(TrainingParticipantRecord).filter(TrainingParticipantRecord.course_id == course_id).order_by(TrainingParticipantRecord.employee_name).all()


@router.post("/training/courses/{course_id}/participants", response_model=TrainingParticipantOut)
def add_course_participant(course_id: uuid.UUID, payload: TrainingParticipantCreate, db: Session = Depends(get_db)):
    course = db.query(TrainingCourse).filter(TrainingCourse.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa đào tạo!")
    
    part = TrainingParticipantRecord(
        course_id=course_id,
        employee_code=payload.employee_code,
        employee_name=payload.employee_name,
        department=payload.department,
        position=payload.position,
        attendance_status=payload.attendance_status,
        pre_test_score=payload.pre_test_score,
        post_test_score=payload.post_test_score,
        evaluation_result=payload.evaluation_result,
        certificate_issued=payload.certificate_issued,
        notes=payload.notes,
    )
    db.add(part)
    db.commit()
    db.refresh(part)
    return part


@router.put("/training/participants/{participant_id}", response_model=TrainingParticipantOut)
def update_course_participant(participant_id: uuid.UUID, payload: TrainingParticipantUpdate, db: Session = Depends(get_db)):
    part = db.query(TrainingParticipantRecord).filter(TrainingParticipantRecord.participant_id == participant_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin học viên!")
    
    update_data = payload.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(part, k, v)
    db.commit()
    db.refresh(part)
    return part


@router.delete("/training/participants/{participant_id}")
def delete_course_participant(participant_id: uuid.UUID, db: Session = Depends(get_db)):
    part = db.query(TrainingParticipantRecord).filter(TrainingParticipantRecord.participant_id == participant_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Không tìm thấy học viên!")
    db.delete(part)
    db.commit()
    return {"message": "Đã xóa học viên"}


# ==================== HEALTH DECLARATIONS (CRUD) ====================
@router.get("/health-declarations", response_model=List[HealthDeclarationOut])
def list_health_declarations(
    shift_date: Optional[date] = None,
    shift_name: Optional[str] = None,
    dept: Optional[str] = None,
    cleared_for_shift: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(HealthDeclarationRecord)
    if shift_date:
        q = q.filter(HealthDeclarationRecord.shift_date == shift_date)
    if shift_name and shift_name != "ALL":
        q = q.filter(HealthDeclarationRecord.shift_name == shift_name)
    if dept and dept != "ALL":
        q = q.filter(HealthDeclarationRecord.department == dept)
    if cleared_for_shift and cleared_for_shift != "ALL":
        q = q.filter(HealthDeclarationRecord.cleared_for_shift == cleared_for_shift)
    
    return q.order_by(desc(HealthDeclarationRecord.shift_date), desc(HealthDeclarationRecord.created_at)).all()


@router.post("/health-declarations", response_model=HealthDeclarationOut)
def create_health_declaration(payload: HealthDeclarationCreate, db: Session = Depends(get_db)):
    # Tự động thẩm định trạng thái nếu có sốt hoặc vết thương hở
    cleared = payload.cleared_for_shift
    symptoms = payload.symptoms or {}
    has_serious_symptom = symptoms.get("fever") or symptoms.get("diarrhea") or symptoms.get("vomiting") or symptoms.get("open_wound")
    
    if payload.body_temperature >= 37.8 or has_serious_symptom:
        cleared = "SUSPENDED"
    elif symptoms.get("cough") or not payload.personal_hygiene_check.get("clean_uniform", True):
        if cleared != "SUSPENDED":
            cleared = "RESTRICTED"

    dec = HealthDeclarationRecord(
        employee_code=payload.employee_code,
        employee_name=payload.employee_name,
        department=payload.department,
        shift_date=payload.shift_date,
        shift_name=payload.shift_name,
        symptoms=payload.symptoms,
        body_temperature=payload.body_temperature,
        personal_hygiene_check=payload.personal_hygiene_check,
        cleared_for_shift=cleared,
        supervisor_name=payload.supervisor_name,
        notes=payload.notes,
    )
    db.add(dec)
    db.commit()
    db.refresh(dec)
    return dec


@router.put("/health-declarations/{declaration_id}", response_model=HealthDeclarationOut)
def update_health_declaration(declaration_id: uuid.UUID, payload: HealthDeclarationUpdate, db: Session = Depends(get_db)):
    dec = db.query(HealthDeclarationRecord).filter(HealthDeclarationRecord.declaration_id == declaration_id).first()
    if not dec:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản khai báo sức khỏe!")
    
    update_data = payload.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(dec, k, v)
    db.commit()
    db.refresh(dec)
    return dec


@router.delete("/health-declarations/{declaration_id}")
def delete_health_declaration(declaration_id: uuid.UUID, db: Session = Depends(get_db)):
    dec = db.query(HealthDeclarationRecord).filter(HealthDeclarationRecord.declaration_id == declaration_id).first()
    if not dec:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản khai báo sức khỏe!")
    db.delete(dec)
    db.commit()
    return {"message": "Đã xóa bản khai báo sức khỏe"}


# ==================== AI ASSISTANTS ====================
@router.post("/ai/generate-checklist")
def ai_generate_checklist(payload: AIChecklistRequest):
    topic = payload.clause_or_dept.lower()
    
    if "8.2" in topic or "prp" in topic or "vệ sinh" in topic:
        questions = [
            {"clause": "8.2.4", "title": "Bố trí mặt bằng & Luồng di chuyển", "dept": "Xưởng sản xuất", "question": "Luồng di chuyển của công nhân, nguyên liệu và rác thải có tách biệt, tránh nguy cơ nhiễm chéo hay không?", "evidence": "Sơ đồ mặt bằng, quan sát thực tế luồng di chuyển tại cửa vào ca."},
            {"clause": "8.2.4", "title": "Hệ thống thông gió & Kiểm soát nhiệt độ", "dept": "Xưởng chế biến", "question": "Hệ thống thông gió áp lực dương tại phòng sạch và nhiệt độ phòng sơ chế có duy trì <= 18°C không?", "evidence": "Nhật ký kiểm tra nhiệt độ ẩm kế và đồng hồ đo áp lực phòng."},
            {"clause": "8.2.4", "title": "Kiểm soát động vật gây hại (Pest Control)", "dept": "Kho & Nhà xưởng", "question": "Bẫy đèn côn trùng và bẫy chuột ngoài rìa có được đặt đúng sơ đồ và kiểm tra định kỳ hàng tuần không?", "evidence": "Sơ đồ bẫy bả và nhật ký dịch vụ PCO bên ngoài."},
            {"clause": "8.2.4", "title": "Hóa chất tẩy rửa & Vệ sinh CIP", "dept": "Đội Vệ sinh", "question": "Hóa chất tẩy rửa tiếp xúc thực phẩm có chứng nhận Food Grade và lưu trữ trong kho riêng biệt có khóa không?", "evidence": "Kho hóa chất, bảng MSDS và tem nhãn chai lọ san chiết."},
        ]
    elif "8.5" in topic or "haccp" in topic or "ccp" in topic:
        questions = [
            {"clause": "8.5.1.2", "title": "Lưu đồ công đoạn sản xuất", "dept": "Phòng Sản Xuất", "question": "Lưu đồ công đoạn sản xuất thực tế tại hiện trường có khớp 100% với tài liệu Kế hoạch HACCP đã phê duyệt không?", "evidence": "Quan sát thực tế từng công đoạn từ rã đông, phối trộn đến đóng gói."},
            {"clause": "8.5.4.2", "title": "Giới hạn tới hạn CCP (Critical Limits)", "dept": "QA/QC", "question": "Giới hạn tới hạn nhiệt độ tiệt trùng tâm (>= 85°C trong 15 phút) có được thiết lập dựa trên cơ sở khoa học và xác nhận giá trị sử dụng không?", "evidence": "Hồ sơ thẩm định xác nhận giá trị sử dụng (Validation Report) và nhật ký đo."},
            {"clause": "8.5.4.3", "title": "Hệ thống giám sát tại CCP", "dept": "KCS Ca", "question": "Thiết bị đo nhiệt độ và thời gian tại CCP tiệt trùng có được hiệu chuẩn định kỳ và kiểm tra sai số hàng ca không?", "evidence": "Tem hiệu chuẩn QUATEST và nhật ký đối chiếu nhiệt kế chuẩn."},
            {"clause": "8.5.4.4", "title": "Hành động khi vượt giới hạn tới hạn", "dept": "Trưởng Ca SX", "question": "Khi nhiệt độ mẻ tiệt trùng bị hụt dưới 85°C, quy trình cô lập lô và tái tiệt trùng có được kích hoạt tức thì không?", "evidence": "Phiếu ghi nhận độ lệch CCP và biên bản cách ly lô hàng."},
        ]
    else:
        questions = [
            {"clause": "4.1", "title": "Hiểu tổ chức và bối cảnh", "dept": "Ban Giám Đốc", "question": "Các yếu tố rủi ro bên ngoài (biến động nguồn cung, luật ATTP mới) có được rà soát định kỳ hàng quý không?", "evidence": "Biên bản họp xem xét bối cảnh và ma trận SWOT ATTP."},
            {"clause": "5.2", "title": "Chính sách An toàn Thực phẩm", "dept": "Toàn Công Ty", "question": "Chính sách ATTP có được niêm yết tại các vị trí dễ thấy và 100% công nhân có nhận thức rõ ràng không?", "evidence": "Bảng tin nhà máy và phỏng vấn ngẫu nhiên 3 công nhân vận hành."},
            {"clause": "7.1.5", "title": "Kiểm soát thiết bị đo lường", "dept": "Bảo Trì & QC", "question": "Cân kiểm tra trọng lượng và khúc xạ kế đo nồng độ có dán tem hiệu chuẩn còn hạn sử dụng không?", "evidence": "Danh mục thiết bị đo lường và biên bản kiểm định VILAS."},
            {"clause": "9.2", "title": "Chương trình Đánh giá nội bộ", "dept": "Ban ISO", "question": "Đoàn đánh giá có đảm bảo tính độc lập khách quan (không tự đánh giá công việc của phòng mình) không?", "evidence": "Quyết định thành lập đoàn đánh giá và bảng phân công đánh giá chéo."},
            {"clause": "10.1", "title": "Sự không phù hợp & Hành động khắc phục", "dept": "QA", "question": "Tất cả các lỗi phát hiện trong đợt đánh giá trước có được thẩm tra hiệu lực đóng phiếu CAPA đúng hạn 30 ngày không?", "evidence": "Hồ sơ thẩm tra CAPA và biên bản kiểm tra lại hiện trường."},
        ]

    return {
        "topic": payload.clause_or_dept,
        "suggested_questions": questions,
        "ai_note": "Danh mục câu hỏi được thiết kế theo cấu trúc chuẩn ISO 22000:2018 và FSSC 22000 v6.0."
    }


@router.post("/ai/evaluate-finding")
def ai_evaluate_finding(payload: AIEvaluateFindingRequest):
    text = payload.finding_text.lower()
    
    major_keywords = [
        "dị vật", "kim loại", "rỉ sét", "thủy tinh", "nhiễm khuẩn", "salmonella",
        "e.coli", "listeria", "mất kiểm soát ccp", "vượt ngưỡng", "hỏng máy tiệt trùng",
        "chưa hiệu chuẩn ccp", "dị nguyên", "nhiễm chéo", "chảy máu", "độc tố"
    ]
    minor_keywords = [
        "chưa ghi chép", "thiếu chữ ký", "chưa dán nhãn", "móng tay", "quên đeo khẩu trang",
        "bụi bẩn", "hết hạn", "bảo hộ", "lau chùi", "nhầm lẫn"
    ]

    if any(k in text for k in major_keywords):
        result = "MAJOR_NC"
        severity_reason = "Ảnh hưởng trực tiếp đến an toàn sản phẩm hoặc làm mất hiệu lực của hệ thống kiểm soát mối nguy tới hạn CCP."
        suggested_clause = payload.clause_number or "8.5.4 (Kiểm soát CCP)"
        action = "Lập tức cô lập sản phẩm liên quan, đình chỉ xuất xưởng, lập phiếu Báo cáo NC (Phase 7 CAPA) và điều tra 5-Why tìm nguyên nhân gốc rễ."
    elif any(k in text for k in minor_keywords):
        result = "MINOR_NC"
        severity_reason = "Sai lệch quy trình nhưng không gây nguy cơ mất an toàn thực phẩm tức thì, có thể khắc phục nhanh trong ca."
        suggested_clause = payload.clause_number or "8.2 (Chương trình Tiên quyết PRP)"
        action = "Khắc phục ngay tại hiện trường (nhắc nhở, vệ sinh bổ sung) và giám sát tái kiểm tra sau 7 ngày."
    else:
        result = "OFI"
        severity_reason = "Hiện tại đáp ứng chuẩn mực nhưng có thể cải tiến để tối ưu hóa năng suất và giảm thiểu sai sót."
        suggested_clause = payload.clause_number or "10.2 (Cải tiến liên tục)"
        action = "Đưa vào danh mục Cơ hội Cải tiến (OFI) để xem xét tại cuộc họp Lãnh đạo định kỳ."

    return {
        "finding_text": payload.finding_text,
        "suggested_classification": result,
        "suggested_clause": suggested_clause,
        "severity_reason": severity_reason,
        "recommended_action": action,
    }


@router.post("/ai/generate-quiz")
def ai_generate_quiz(payload: AIQuizRequest):
    topic = payload.topic.lower()
    
    if "haccp" in topic or "ccp" in topic:
        quiz = [
            {
                "id": 1,
                "question": "Giới hạn tới hạn (Critical Limit) tại một điểm CCP được định nghĩa là gì?",
                "options": [
                    "A. Giá trị nhiệt độ tối thiểu mà máy móc có thể đạt được",
                    "B. Ranh giới phân định giữa mức chấp nhận được và không thể chấp nhận được về an toàn thực phẩm",
                    "C. Mức chỉ tiêu do khách hàng yêu cầu trong hợp đồng mua bán",
                    "D. Thời gian chạy máy liên tục trong một ca sản xuất"
                ],
                "correct_option": "B",
                "explanation": "Theo ISO 22000:2018 Điều 3.12, Giới hạn tới hạn là chuẩn mực có thể đo lường được để phân định khả năng chấp nhận được."
            },
            {
                "id": 2,
                "question": "Khi phát hiện giá trị đo tại CCP vượt quá giới hạn tới hạn, hành động ĐẦU TIÊN của nhân viên vận hành là gì?",
                "options": [
                    "A. Tiếp tục chạy máy và báo cáo vào cuối ca",
                    "B. Bấm nút bỏ qua cảnh báo trên màn hình điều khiển",
                    "C. Lập tức cô lập/dừng lô sản phẩm bị ảnh hưởng và báo ngay cho KCS/Trưởng ca",
                    "D. Tự ý thay đổi cài đặt thông số mà không ghi chép"
                ],
                "correct_option": "C",
                "explanation": "Điều khoản 8.9.2 yêu cầu cô lập tức thì sản phẩm có khả năng không an toàn."
            },
            {
                "id": 3,
                "question": "Mối nguy nào sau đây thuộc nhóm Mối nguy Vật lý (Physical Hazard)?",
                "options": [
                    "A. Độc tố vi nấm Aflatoxin",
                    "B. Mảnh kim loại rỉ sét hoặc mảnh thủy tinh vỡ",
                    "C. Vi khuẩn Listeria monocytogenes",
                    "D. Dư lượng thuốc trừ sâu gốc clo"
                ],
                "correct_option": "B",
                "explanation": "Mảnh kim loại, thủy tinh, đá sỏi, xương cá là các mối nguy vật lý gây nghẹt thở hoặc tổn thương cơ học."
            },
            {
                "id": 4,
                "question": "Tần suất hiệu chuẩn đối với thiết bị giám sát CCP chính yếu (như nhiệt kế tâm, máy dò kim loại) thường là bao lâu?",
                "options": [
                    "A. 5 năm một lần",
                    "B. Khi nào máy hỏng mới hiệu chuẩn",
                    "C. Định kỳ 6 - 12 tháng bởi cơ quan được công nhận (VILAS) và đối chiếu mẫu chuẩn mỗi đầu ca",
                    "D. Chỉ cần hiệu chuẩn khi khách hàng yêu cầu"
                ],
                "correct_option": "C",
                "explanation": "Theo ISO 22000 Điều 7.1.5.2, thiết bị đo lường phải được hiệu chuẩn định kỳ và lưu hồ sơ."
            },
            {
                "id": 5,
                "question": "Mục đích chính của việc thẩm định giá trị sử dụng (Validation) Kế hoạch HACCP là gì?",
                "options": [
                    "A. Chứng minh bằng chứng khoa học rằng các biện pháp kiểm soát có khả năng tiêu diệt mối nguy đến mức chấp nhận được",
                    "B. Để hoàn thiện hồ sơ đối phó đoàn thanh tra",
                    "C. Để giảm bớt chi phí kiểm nghiệm phòng lab",
                    "D. Để thay thế việc đào tạo công nhân"
                ],
                "correct_option": "A",
                "explanation": "Validation (ISO 8.5.3) nhằm thu thập bằng chứng khoa học trước khi đưa quy trình vào vận hành thực tế."
            }
        ]
    else:
        quiz = [
            {
                "id": 1,
                "question": "Theo quy tắc vệ sinh cá nhân GMP, công nhân phải rửa tay khử trùng vào những thời điểm nào?",
                "options": [
                    "A. Trước khi bắt đầu làm việc, sau khi đi vệ sinh, và sau khi chạm vào vật phẩm bẩn/rác",
                    "B. Chỉ cần rửa tay một lần vào đầu giờ sáng",
                    "C. Chỉ rửa tay khi thấy tay có vết bẩn nhìn thấy bằng mắt thường",
                    "D. Rửa tay sau khi kết thúc ca làm việc ra về"
                ],
                "correct_option": "A",
                "explanation": "Rửa tay đúng 6 bước và sát khuẩn cồn 70° là yêu cầu tiên quyết bắt buộc trước khi tiếp xúc thực phẩm."
            },
            {
                "id": 2,
                "question": "Trường hợp công nhân bị đứt tay chảy máu trong xưởng sản xuất, xử lý đúng chuẩn ISO là gì?",
                "options": [
                    "A. Lấy khăn lau tạm rồi làm tiếp",
                    "B. Dán băng gạc màu sáng/xanh dương chống thấm có gắn sợi kim loại và báo cáo quản lý",
                    "C. Dùng băng dính trong dán kín vết thương",
                    "D. Không cần làm gì nếu vết thương nhỏ"
                ],
                "correct_option": "B",
                "explanation": "Băng gạc y tế màu xanh có sợi kim loại giúp dễ phát hiện bằng mắt hoặc máy dò kim loại nếu rơi rớt."
            },
            {
                "id": 3,
                "question": "Dầu mỡ bôi trơn máy móc được phép sử dụng trong khu vực chế biến thực phẩm phải đạt tiêu chuẩn gì?",
                "options": [
                    "A. Dầu nhớt động cơ xe máy thông thường",
                    "B. Dầu mỡ Food Grade đạt chứng nhận NSF H1 (an toàn khi vô tình tiếp xúc thực phẩm <= 10ppm)",
                    "C. Mỡ bò công nghiệp chịu nhiệt",
                    "D. Bất kỳ loại dầu nhớt nào có sẵn trong kho bảo trì"
                ],
                "correct_option": "B",
                "explanation": "Chỉ mỡ bôi trơn NSF H1 mới được phép sử dụng cho máy chế biến thực phẩm."
            },
            {
                "id": 4,
                "question": "Khi phát hiện một đồng nghiệp có triệu chứng sốt cao và tiêu chảy trong ca, bạn nên làm gì?",
                "options": [
                    "A. Động viên bạn cố gắng làm hết ca",
                    "B. Báo cáo ngay cho Tổ trưởng / Y tế để đình chỉ vào xưởng và chuyển đi khám cách ly",
                    "C. Cho bạn uống thuốc hạ sốt rồi tiếp tục đóng gói hàng",
                    "D. Giữ bí mật để không ảnh hưởng thi đua của tổ"
                ],
                "correct_option": "B",
                "explanation": "Triệu chứng tiêu chảy/sốt tiềm ẩn nguy cơ lây nhiễm vi khuẩn tả, Salmonella sang thực phẩm."
            },
            {
                "id": 5,
                "question": "Quy tắc 5S trong nhà máy chế biến thực phẩm bao gồm những bước nào?",
                "options": [
                    "A. Sàng lọc - Sắp xếp - Sạch sẽ - Săn sóc - Sẵn sàng",
                    "B. Sản xuất - Sửa chữa - Sơ chế - Sấy khô - San chiết",
                    "C. Sáng tạo - Siêng năng - Sạch đẹp - Sung túc - Sẵn lòng",
                    "D. Soát xét - Sắp đặt - Sửa đổi - So sánh - Sát hạch"
                ],
                "correct_option": "A",
                "explanation": "5S là nền tảng quản lý trực quan và duy trì vệ sinh môi trường làm việc."
            }
        ]

    return {
        "topic": payload.topic,
        "total_questions": len(quiz),
        "questions": quiz,
        "pass_mark_percent": 70,
    }


@router.post("/ai/scan-health-risk")
def ai_scan_health_risk(payload: AIHealthRiskRequest, db: Session = Depends(get_db)):
    q = db.query(HealthDeclarationRecord)
    if payload.department and payload.department != "ALL":
        q = q.filter(HealthDeclarationRecord.department == payload.department)
    if payload.date_filter:
        q = q.filter(HealthDeclarationRecord.shift_date == payload.date_filter)
    
    declarations = q.all()
    total = len(declarations)
    
    fever_cases = [d for d in declarations if d.body_temperature >= 37.5 or (d.symptoms and d.symptoms.get("fever"))]
    wound_cases = [d for d in declarations if d.symptoms and d.symptoms.get("open_wound")]
    digestive_cases = [d for d in declarations if d.symptoms and (d.symptoms.get("diarrhea") or d.symptoms.get("vomiting"))]
    suspended_cases = [d for d in declarations if d.cleared_for_shift == "SUSPENDED"]
    restricted_cases = [d for d in declarations if d.cleared_for_shift == "RESTRICTED"]

    risk_level = "LOW"
    recommendations = []

    if len(suspended_cases) > 0 or len(digestive_cases) > 0:
        risk_level = "HIGH"
        recommendations.append("LẬP TỨC CÁCH LY: Đình chỉ toàn bộ các nhân sự có triệu chứng tiêu hóa hoặc vết thương hở khỏi dây chuyền sản xuất.")
        recommendations.append("KHỬ TRÙNG KHẨN CẤP: Tiến hành phun khử trùng Cloramin B toàn bộ khu vực thay đồ và dây chuyền liên quan.")
    elif len(fever_cases) > 0 or len(restricted_cases) > 0:
        risk_level = "MEDIUM"
        recommendations.append("GIÁM SÁT CHẶT CHẼ: Chuyển các nhân sự có biểu hiện nhẹ sang bộ phận không tiếp xúc thực phẩm (Kho ngoài, bốc dỡ vỏ thùng).")
        recommendations.append("ĐO THÂN NHIỆT LẠI: Kiểm tra thân nhiệt giữa ca làm việc.")
    else:
        recommendations.append("TIẾP TỤC DUY TRÌ: 100% nhân sự đạt chuẩn sức khỏe và vệ sinh cá nhân.")

    return {
        "total_scanned": total,
        "risk_level": risk_level,
        "fever_count": len(fever_cases),
        "open_wound_count": len(wound_cases),
        "digestive_symptom_count": len(digestive_cases),
        "suspended_count": len(suspended_cases),
        "restricted_count": len(restricted_cases),
        "recommendations": recommendations,
        "scanned_at": datetime.utcnow().isoformat(),
    }


# ==================== SEED DEFAULTS ====================
@router.post("/seed-defaults")
def seed_default_audits(db: Session = Depends(get_db)):
    # 1. Seed Internal Audits
    if db.query(InternalAudit).count() == 0:
        aud1 = InternalAudit(
            audit_code="IA-2026-Q1",
            title="Đánh Giá Nội Bộ Định Kỳ Quý 1/2026 – Toàn Diện Dây Chuyền Chế Biến",
            audit_type="PERIODIC",
            start_date=date.today() - timedelta(days=20),
            end_date=date.today() - timedelta(days=18),
            lead_auditor_name="ThS. Nguyễn Văn An (Lead Auditor)",
            auditor_team=[
                {"name": "Trần Thị Bình", "role": "Auditor", "dept": "QA/QC"},
                {"name": "Lê Hoàng Nam", "role": "Technical Expert", "dept": "Bảo Trì"},
            ],
            audited_dept="Phòng Sản Xuất & Chế Biến Thủy Sản",
            audited_lead_name="Võ Văn Cường (Quản Đốc Xưởng)",
            scope="Toàn bộ quy trình tiếp nhận nguyên liệu, sơ chế, hấp/tiệt trùng và cấp đông IQF.",
            standard_clauses=["Clause 4", "Clause 7", "Clause 8.2 PRP", "Clause 8.5 HACCP", "Clause 8.9 CAPA"],
            findings_summary="Hệ thống vận hành tốt, phát hiện 1 Minor NC tại khu vực sơ chế và 1 OFI về quản lý trực quan 5S.",
            conclusion="Hệ thống Quản lý An toàn Thực phẩm FSMS tại Xưởng Sản xuất đạt mức TUÂN THỦ TỐT, cho phép duy trì chứng chỉ ISO 22000:2018.",
            status="COMPLETED",
        )
        aud2 = InternalAudit(
            audit_code="IA-2026-Q2",
            title="Đánh Giá Đột Xuất – Kiểm Soát Dị Nguyên & Khử Trùng Bề Mặt",
            audit_type="UNANNOUNCED",
            start_date=date.today() - timedelta(days=5),
            end_date=date.today() - timedelta(days=4),
            lead_auditor_name="Trần Thị Bình (QA Manager)",
            auditor_team=[{"name": "Nguyễn Văn An", "role": "Auditor", "dept": "Ban ISO"}],
            audited_dept="Kho Nguyên Liệu & Phụ Gia",
            audited_lead_name="Đặng Thị Mai (Thủ Kho)",
            scope="Kiểm tra việc lưu trữ riêng biệt nguyên liệu dị nguyên (tôm, đậu phộng, mè) và kiểm soát nhãn phụ.",
            standard_clauses=["Clause 8.2 PRP", "Clause 8.4 Mua hàng"],
            findings_summary="Phát hiện bao bì mè rang đặt sát pallet bột mì, có nguy cơ nhiễm chéo dị nguyên.",
            conclusion="Cần khắc phục ngay việc phân vùng lưu trữ theo ma trận dị nguyên.",
            status="REPORTING",
        )
        aud3 = InternalAudit(
            audit_code="IA-2026-Q3",
            title="Đánh Giá Tiền Chứng Nhận (Pre-Audit) Tái Đánh Giá ISO 22000:2018",
            audit_type="PRE_CERTIFICATION",
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            lead_auditor_name="Ban Cố Vấn Chuyên Gia WCERT",
            auditor_team=[{"name": "Chuyên Gia Đánh Giá Trưởng", "role": "Lead", "dept": "WCERT"}],
            audited_dept="Toàn bộ các phòng ban trong Nhà máy",
            audited_lead_name="Ban Giám Đốc",
            scope="Toàn bộ 10 điều khoản tiêu chuẩn ISO 22000:2018 và FSSC 22000 v6.",
            standard_clauses=["Clause 4 đến Clause 10"],
            status="PLANNED",
        )
        db.add_all([aud1, aud2, aud3])
        db.flush()

        # Seed Findings for aud1
        f1 = AuditFinding(
            audit_id=aud1.audit_id,
            clause_number="8.2.4",
            clause_title="Bố trí mặt bằng xưởng & Vệ sinh môi trường",
            department="Xưởng sơ chế",
            question="Rãnh thoát nước có lưới chắn côn trùng và không bị đọng rác hay không?",
            evidence_reviewed="Kiểm tra 4 hố ga và rãnh thoát nước chính.",
            result="CONFORMITY",
            finding_notes="Rãnh thoát nước sạch sẽ, dòng chảy xuôi chiều, lưới chắn inox nguyên vẹn.",
        )
        f2 = AuditFinding(
            audit_id=aud1.audit_id,
            clause_number="8.5.4",
            clause_title="Giám sát điểm kiểm soát tới hạn CCP",
            department="Tổ Tiệt trùng",
            question="Nhật ký đo nhiệt độ tiệt trùng tâm sản phẩm có ghi chép đầy đủ mỗi 30 phút không?",
            evidence_reviewed="Biên bản giám sát ca sáng và ca chiều ngày 10/06.",
            result="CONFORMITY",
            finding_notes="Ghi chép đầy đủ, có đối chiếu nhiệt kế chuẩn, nhiệt độ tâm đạt 86.5°C.",
        )
        f3 = AuditFinding(
            audit_id=aud1.audit_id,
            clause_number="7.1.5",
            clause_title="Kiểm soát thiết bị đo lường & Giám sát",
            department="Phòng KCS",
            question="Khúc xạ kế đo độ ngọt Brix có tem hiệu chuẩn còn hạn sử dụng không?",
            evidence_reviewed="Khúc xạ kế mã TB-BX-03 tại bàn kiểm tra KCS.",
            result="MINOR_NC",
            finding_notes="Tem hiệu chuẩn đã hết hạn 5 ngày chưa gửi kiểm định lại VILAS.",
        )
        f4 = AuditFinding(
            audit_id=aud1.audit_id,
            clause_number="10.2",
            clause_title="Cải tiến liên tục & Quản lý trực quan 5S",
            department="Xưởng đóng gói",
            question="Vị trí đặt dụng cụ vệ sinh có phân màu theo khu vực (Khu sạch vs Khu thô) không?",
            evidence_reviewed="Khu vực tủ để chổi và cây lau sàn xưởng đóng gói.",
            result="OFI",
            finding_notes="Nên bổ sung bảng mã màu trực quan dán tại cửa tủ để công nhân mới không lấy nhầm.",
        )
        db.add_all([f1, f2, f3, f4])

        # Seed Findings for aud2
        f5 = AuditFinding(
            audit_id=aud2.audit_id,
            clause_number="8.2.4",
            clause_title="Kiểm soát lây nhiễm chéo dị nguyên (Allergen)",
            department="Kho Nguyên Liệu",
            question="Nguyên liệu chứa thành phần dị nguyên có được cách ly và dán nhãn cảnh báo không?",
            evidence_reviewed="Khu vực kệ A2 kho phụ gia khô.",
            result="MAJOR_NC",
            finding_notes="Pallet mè rang (dị nguyên nhóm hạt) xếp chồng trực tiếp lên pallet bột mì không có màng bọc cách ly.",
        )
        db.add(f5)

        # Seed Findings for aud3 (IA-2026-Q3)
        f6 = AuditFinding(
            audit_id=aud3.audit_id,
            clause_number="4.1",
            clause_title="Bối cảnh tổ chức & Nhu cầu các bên quan tâm",
            department="Toàn bộ nhà máy",
            question="Hồ sơ phân tích bối cảnh nội bộ và bên ngoài (SWOT/PESTEL) có được định kỳ cập nhật không?",
            evidence_reviewed="Sổ tay bối cảnh tổ chức và biên bản rà soát hàng quý.",
            result="CONFORMITY",
            finding_notes="Hồ sơ phân tích SWOT và ma trận bên quan tâm được cập nhật đầy đủ.",
        )
        f7 = AuditFinding(
            audit_id=aud3.audit_id,
            clause_number="5.2",
            clause_title="Chính sách An toàn Thực phẩm & Mục tiêu Chất lượng",
            department="Ban Giám Đốc & QA",
            question="Chính sách ATTP có được truyền thông và niêm yết tại các vị trí dễ thấy trong xưởng không?",
            evidence_reviewed="Bảng tin xưởng sản xuất và khu vực tiếp nhận khách.",
            result="CONFORMITY",
            finding_notes="Chính sách ATTP được truyền thông và niêm yết tại 5 phân xưởng chính.",
        )
        f8 = AuditFinding(
            audit_id=aud3.audit_id,
            clause_number="8.4",
            clause_title="Kế hoạch Ứng phó Tình huống Khẩn cấp & Sự cố",
            department="Phòng Bảo Trì & QA",
            question="Kế hoạch ứng phó sự cố cúp điện đột xuất và cháy nổ có được diễn tập định kỳ trong 12 tháng qua không?",
            evidence_reviewed="Nhật ký diễn tập PCCC và ứng phó sự cố kho lạnh.",
            result="MINOR_NC",
            finding_notes="Kế hoạch ứng phó cúp điện đột xuất chưa được diễn tập định kỳ trong 12 tháng qua.",
        )
        f9 = AuditFinding(
            audit_id=aud3.audit_id,
            clause_number="9.3",
            clause_title="Xem xét của Lãnh đạo (Management Review)",
            department="Ban Giám Đốc",
            question="Biên bản họp xem xét lãnh đạo có đầy đủ nội dung theo yêu cầu ISO 22000 Điều khoản 9.3 không?",
            evidence_reviewed="Biên bản họp MR-2026-01 ngày 15/01/2026.",
            result="CONFORMITY",
            finding_notes="Biên bản họp xem xét lãnh đạo hàng quý có chữ ký đầy đủ của Ban Giám đốc.",
        )
        db.add_all([f6, f7, f8, f9])

    # 2. Seed Training Courses
    if db.query(TrainingCourse).count() == 0:
        c1 = TrainingCourse(
            course_code="TR-2026-HACCP",
            title="Đào Tạo Chuyên Sâu 7 Nguyên Tắc HACCP & Giám Sát CCP Thực Tế",
            category="HACCP_CCP",
            trainer_name="ThS. Nguyễn Văn An (Trưởng Ban HACCP)",
            training_type="INTERNAL",
            schedule_date=date.today() - timedelta(days=15),
            duration_hours=8.0,
            target_dept="QC, Vận Hành Nồi Hấp, Trưởng Ca SX",
            content_summary="Nhận diện mối nguy sinh học, hóa học, vật lý; xác định giới hạn tới hạn và quy trình xử lý độ lệch khẩn cấp.",
            status="COMPLETED",
        )
        c2 = TrainingCourse(
            course_code="TR-2026-GMP",
            title="Quy Chuẩn Vệ Sinh Cá Nhân & Thực Hành Sản Xuất Tốt (GMP-SSOP)",
            category="FOOD_HYGIENE_GMP",
            trainer_name="Trần Thị Bình (QA Lead)",
            training_type="INTERNAL",
            schedule_date=date.today() - timedelta(days=7),
            duration_hours=4.0,
            target_dept="Toàn bộ Công nhân trực tiếp sản xuất",
            content_summary="Quy trình rửa tay 6 bước, trang phục BHLĐ, xử lý vết thương hở và vệ sinh khử trùng nhà xưởng.",
            status="COMPLETED",
        )
        c3 = TrainingCourse(
            course_code="TR-2026-ALLERGEN",
            title="Kiểm Soát Nguy Cơ Lây Nhiễm Chéo Dị Nguyên (Allergen Management)",
            category="ALLERGEN_CONTROL",
            trainer_name="Chuyên Gia Viện Vệ Sinh Dịch Tễ",
            training_type="EXTERNAL",
            schedule_date=date.today() + timedelta(days=10),
            duration_hours=4.0,
            target_dept="Kho, Thu Mua, QC Tiếp Nhận",
            content_summary="Ma trận phân tách dị nguyên, quy trình vệ sinh chống nhiễm chéo và dán nhãn ghi nhãn phụ bắt buộc.",
            status="PLANNED",
        )
        c4 = TrainingCourse(
            course_code="TR-2026-RECALL",
            title="Diễn Tập Triệu Hồi Thực Phẩm Khẩn Cấp & Truy Xuất Nguồn Gốc 1 Giờ",
            category="EMERGENCY_RECALL",
            trainer_name="Ban Quản Lý Khủng Hoảng ATTP",
            training_type="INTERNAL",
            schedule_date=date.today() + timedelta(days=25),
            duration_hours=4.0,
            target_dept="Ban Giám Đốc, QA, Kho, Pháp Chế, CSKH",
            content_summary="Kịch bản giả định phát hiện độc tố, kích hoạt Cây phả hệ truy vết 4 tầng và thông báo thu hồi.",
            status="PLANNED",
        )
        db.add_all([c1, c2, c3, c4])
        db.flush()

        # Seed Participants for c1
        p1 = TrainingParticipantRecord(
            course_id=c1.course_id,
            employee_code="NV-0102",
            employee_name="Phạm Văn Dũng",
            department="Tổ Tiệt Trùng",
            position="Kỹ thuật viên vận hành",
            attendance_status="ATTENDED",
            pre_test_score=55.0,
            post_test_score=92.0,
            evaluation_result="PASSED",
            certificate_issued=True,
            notes="Nắm rất chắc quy trình xử lý khi nhiệt kế bị hụt nhiệt.",
        )
        p2 = TrainingParticipantRecord(
            course_id=c1.course_id,
            employee_code="NV-0105",
            employee_name="Lê Thị Hằng",
            department="Phòng KCS",
            position="Nhân viên QC",
            attendance_status="ATTENDED",
            pre_test_score=60.0,
            post_test_score=96.0,
            evaluation_result="PASSED",
            certificate_issued=True,
            notes="Đạt điểm xuất sắc bài thi thực hành lập kế hoạch giám sát CCP.",
        )
        p3 = TrainingParticipantRecord(
            course_id=c1.course_id,
            employee_code="NV-0118",
            employee_name="Đỗ Hoàng Long",
            department="Xưởng Chế Biến",
            position="Công nhân thử việc",
            attendance_status="ATTENDED",
            pre_test_score=40.0,
            post_test_score=64.0,
            evaluation_result="RE_TRAINING_REQUIRED",
            certificate_issued=False,
            notes="Chưa nắm rõ khái niệm Giới hạn tới hạn, cần hướng dẫn lại 2 buổi.",
        )
        db.add_all([p1, p2, p3])

        # Seed Participants for c2
        p4 = TrainingParticipantRecord(
            course_id=c2.course_id,
            employee_code="NV-0201",
            employee_name="Nguyễn Thị Mai",
            department="Xưởng Sơ Chế",
            position="Công nhân sơ chế cá",
            attendance_status="ATTENDED",
            pre_test_score=50.0,
            post_test_score=88.0,
            evaluation_result="PASSED",
            certificate_issued=True,
        )
        p5 = TrainingParticipantRecord(
            course_id=c2.course_id,
            employee_code="NV-0205",
            employee_name="Trần Văn Hùng",
            department="Tổ Đóng Gói",
            position="Công nhân đóng gói",
            attendance_status="ATTENDED",
            pre_test_score=45.0,
            post_test_score=82.0,
            evaluation_result="PASSED",
            certificate_issued=True,
        )
        db.add_all([p4, p5])

        # Seed Participants for c3 (TR-2026-ALLERGEN)
        p6 = TrainingParticipantRecord(
            course_id=c3.course_id,
            employee_code="NV-0301",
            employee_name="Vũ Thị Mai",
            department="Kho Nguyên Liệu",
            position="Thủ kho",
            attendance_status="ATTENDED",
            pre_test_score=60.0,
            post_test_score=90.0,
            evaluation_result="PASSED",
            certificate_issued=True,
            notes="Nắm vững bảng phân nhóm 8 dị nguyên bắt buộc ghi nhãn.",
        )
        p7 = TrainingParticipantRecord(
            course_id=c3.course_id,
            employee_code="NV-0304",
            employee_name="Nguyễn Văn Hùng",
            department="Phòng Thu Mua",
            position="Chuyên viên mua hàng",
            attendance_status="ATTENDED",
            pre_test_score=50.0,
            post_test_score=88.0,
            evaluation_result="PASSED",
            certificate_issued=True,
        )
        p8 = TrainingParticipantRecord(
            course_id=c3.course_id,
            employee_code="NV-0308",
            employee_name="Đặng Quốc Bảo",
            department="Phòng KCS Tiếp Nhận",
            position="KCS Tiếp nhận NVL",
            attendance_status="ATTENDED",
            pre_test_score=70.0,
            post_test_score=95.0,
            evaluation_result="PASSED",
            certificate_issued=True,
        )
        db.add_all([p6, p7, p8])

        # Seed Participants for c4 (TR-2026-RECALL)
        p9 = TrainingParticipantRecord(
            course_id=c4.course_id,
            employee_code="NV-0401",
            employee_name="Lý Trọng Đức",
            department="Kho Thành Phẩm",
            position="Trưởng kho",
            attendance_status="ATTENDED",
            pre_test_score=65.0,
            post_test_score=92.0,
            evaluation_result="PASSED",
            certificate_issued=True,
        )
        p10 = TrainingParticipantRecord(
            course_id=c4.course_id,
            employee_code="NV-0405",
            employee_name="Trần Thu Hà",
            department="Phòng CSKH & Pháp Chế",
            position="Chuyên viên CSKH",
            attendance_status="ATTENDED",
            pre_test_score=55.0,
            post_test_score=85.0,
            evaluation_result="PASSED",
            certificate_issued=True,
        )
        p11 = TrainingParticipantRecord(
            course_id=c4.course_id,
            employee_code="NV-0410",
            employee_name="Nguyễn Văn An",
            department="Phòng QA/FSMS",
            position="QA Lead",
            attendance_status="ATTENDED",
            pre_test_score=80.0,
            post_test_score=98.0,
            evaluation_result="PASSED",
            certificate_issued=True,
        )
        db.add_all([p9, p10, p11])

    # 3. Seed Health Declarations
    if db.query(HealthDeclarationRecord).count() == 0:
        today = date.today()
        h1 = HealthDeclarationRecord(
            employee_code="NV-0102",
            employee_name="Phạm Văn Dũng",
            department="Xưởng Sản Xuất",
            shift_date=today,
            shift_name="Ca Sáng",
            symptoms={"fever": False, "cough": False, "diarrhea": False, "vomiting": False, "open_wound": False, "skin_infection": False},
            body_temperature=36.4,
            personal_hygiene_check={"nails_trimmed": True, "jewelry_removed": True, "clean_uniform": True},
            cleared_for_shift="CLEARED",
            supervisor_name="Y tế Ca: Nguyễn Thị Lan",
            notes="Thân nhiệt bình thường, BHLĐ sạch sẽ.",
        )
        h2 = HealthDeclarationRecord(
            employee_code="NV-0105",
            employee_name="Lê Thị Hằng",
            department="Phòng KCS",
            shift_date=today,
            shift_name="Ca Sáng",
            symptoms={"fever": False, "cough": False, "diarrhea": False, "vomiting": False, "open_wound": False, "skin_infection": False},
            body_temperature=36.6,
            personal_hygiene_check={"nails_trimmed": True, "jewelry_removed": True, "clean_uniform": True},
            cleared_for_shift="CLEARED",
            supervisor_name="Y tế Ca: Nguyễn Thị Lan",
        )
        h3 = HealthDeclarationRecord(
            employee_code="NV-0208",
            employee_name="Trần Quốc Bảo",
            department="Xưởng Chế Biến",
            shift_date=today,
            shift_name="Ca Sáng",
            symptoms={"fever": True, "cough": True, "diarrhea": False, "vomiting": False, "open_wound": False, "skin_infection": False},
            body_temperature=38.2,
            personal_hygiene_check={"nails_trimmed": True, "jewelry_removed": True, "clean_uniform": True},
            cleared_for_shift="SUSPENDED",
            supervisor_name="Y tế Ca: Nguyễn Thị Lan",
            notes="Phát hiện sốt 38.2°C và ho nhiều, đã đình chỉ vào xưởng sản xuất và cấp giấy chuyển viện khám hô hấp.",
        )
        h4 = HealthDeclarationRecord(
            employee_code="NV-0215",
            employee_name="Võ Thị Ánh",
            department="Xưởng Đóng Gói",
            shift_date=today,
            shift_name="Ca Sáng",
            symptoms={"fever": False, "cough": False, "diarrhea": False, "vomiting": False, "open_wound": True, "skin_infection": False},
            body_temperature=36.5,
            personal_hygiene_check={"nails_trimmed": True, "jewelry_removed": True, "clean_uniform": True},
            cleared_for_shift="SUSPENDED",
            supervisor_name="Y tế Ca: Nguyễn Thị Lan",
            notes="Có vết thương hở rỉ dịch ở ngón tay trỏ, đình chỉ tiếp xúc trực tiếp sản phẩm, chuyển sang tổ dán nhãn thùng ngoài.",
        )
        h5 = HealthDeclarationRecord(
            employee_code="NV-0301",
            employee_name="Lê Hữu Thắng",
            department="Kho Lạnh",
            shift_date=today,
            shift_name="Ca Sáng",
            symptoms={"fever": False, "cough": True, "diarrhea": False, "vomiting": False, "open_wound": False, "skin_infection": False},
            body_temperature=36.8,
            personal_hygiene_check={"nails_trimmed": True, "jewelry_removed": True, "clean_uniform": True},
            cleared_for_shift="RESTRICTED",
            supervisor_name="Y tế Ca: Nguyễn Thị Lan",
            notes="Ho nhẹ không sốt, yêu cầu đeo 2 lớp khẩu trang y tế và chỉ bốc dỡ kiện hàng đóng kín.",
        )
        db.add_all([h1, h2, h3, h4, h5])

    db.commit()
    return {"message": "Đã nạp dữ liệu mẫu Đánh giá nội bộ, Đào tạo và Khai báo sức khỏe thành công!"}
