from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_password_hash
from app.modules.auth.models import User, Role, Department
from app.modules.organization.models import InterestedParty, ContextRisk, CommunicationLog, FoodSafetyTeamMember
from app.modules.organization.schemas import (
    UserOut, UserCreate, UserUpdate,
    DepartmentOut, DepartmentCreate, DepartmentUpdate,
    InterestedPartyCreate, InterestedPartyUpdate, InterestedPartyResponse,
    ContextRiskCreate, ContextRiskUpdate, ContextRiskResponse, ContextStatsResponse,
    CommunicationLogCreate, CommunicationLogUpdate, CommunicationLogResponse,
    FoodSafetyTeamMemberCreate, FoodSafetyTeamMemberUpdate, FoodSafetyTeamMemberResponse,
)
from typing import List, Optional, Any
from datetime import datetime, date
import uuid

router = APIRouter(prefix="/organization", tags=["Organization"])

def format_user_out(user: User) -> UserOut:
    """Chuyển đổi User ORM sang UserOut schema an toàn về kiểu dữ liệu"""
    role_obj = user.roles[0] if user.roles else None
    role_label = str(role_obj.role_name) if role_obj else "Chưa phân quyền"
    role_code = str(role_obj.role_code).lower() if role_obj else "user"
    return UserOut(
        id=str(user.user_id),
        name=str(user.full_name),
        username=str(user.username),
        dept=str(user.department or "Chờ phân bổ"),
        role_code=role_code,
        role=role_label,
        email=str(user.email) if user.email else None,
        phone=str(user.phone) if user.phone else None,
        status="Hoạt động" if user.is_active else "Khoá"
    )

def format_dept_out(dept: Department, count: int = 0) -> DepartmentOut:
    """Chuyển đổi Department ORM sang DepartmentOut schema an toàn về kiểu dữ liệu"""
    return DepartmentOut(
        id=str(dept.dept_id),
        name=str(dept.dept_name),
        role_code=str(dept.dept_code),
        count=count,
        head="",
        description=str(dept.description) if dept.description else None
    )

# ==================== USERS CRUD ====================

@router.get("/users", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db)):
    """Lấy danh sách người dùng trong hệ thống"""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [format_user_out(u) for u in users]

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    """Tạo mới tài khoản người dùng và gán vai trò phòng ban"""
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")

    role = db.query(Role).filter(
        (Role.role_code == payload.role_code.lower()) | 
        (Role.role_code == payload.role_code.upper()) |
        (Role.role_name == payload.role_code)
    ).first()

    new_user = User(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        full_name=payload.name,
        department=payload.dept,
        email=payload.email,
        phone=payload.phone,
        is_active=(payload.status == "Hoạt động")
    )
    if role:
        new_user.roles.append(role)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return format_user_out(new_user)

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin và phân quyền người dùng"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if payload.name is not None:
        user.full_name = payload.name
    if payload.dept is not None:
        user.department = payload.dept
    if payload.email is not None:
        user.email = payload.email
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.status is not None:
        user.is_active = (payload.status == "Hoạt động")

    if payload.role_code is not None:
        role = db.query(Role).filter(
            (Role.role_code == payload.role_code.lower()) | 
            (Role.role_code == payload.role_code.upper()) |
            (Role.role_name == payload.role_code)
        ).first()
        if role:
            user.roles = [role]
            if not payload.dept:
                user.department = role.role_name

    db.commit()
    db.refresh(user)

    return format_user_out(user)

@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    """Xóa tài khoản người dùng"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    db.delete(user)
    db.commit()
    return {"message": "Đã xoá người dùng thành công"}


# ==================== DEPARTMENTS CRUD ====================

@router.get("/departments", response_model=List[DepartmentOut])
def get_departments(db: Session = Depends(get_db)):
    """Lấy danh sách các phòng ban và số lượng thành viên trực thuộc từ bảng departments"""
    depts = db.query(Department).order_by(Department.dept_name.asc()).all()
    results = []
    for d in depts:
        count = db.query(func.count(User.user_id)).filter(User.department == d.dept_name).scalar() or 0
        results.append(format_dept_out(d, int(count)))
    return results

@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db)):
    """Tạo mới phòng ban"""
    dept_code = payload.role_code or f"DEPT-{payload.name.upper().replace(' ', '_')}"
    existing = db.query(Department).filter(
        (Department.dept_code == dept_code) | (Department.dept_name == payload.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phòng ban đã tồn tại")

    new_dept = Department(
        dept_code=dept_code,
        dept_name=payload.name,
        description=payload.description or f"Phòng ban {payload.name}"
    )
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)

    return format_dept_out(new_dept, count=0)

@router.put("/departments/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: str, payload: DepartmentUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin phòng ban"""
    dept = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban")

    old_name = dept.dept_name
    if payload.name is not None and payload.name.strip():
        new_name = payload.name.strip()
        db.query(User).filter(User.department == old_name).update({User.department: new_name})
        dept.dept_name = new_name

    if payload.description is not None:
        dept.description = payload.description

    db.commit()
    db.refresh(dept)

    count = db.query(func.count(User.user_id)).filter(User.department == dept.dept_name).scalar() or 0
    return format_dept_out(dept, count=int(count))

@router.delete("/departments/{dept_id}")
def delete_department(dept_id: str, db: Session = Depends(get_db)):
    """Xóa phòng ban"""
    dept = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban")
    
    db.query(User).filter(User.department == dept.dept_name).update({User.department: "Chờ phân bổ"})
    db.delete(dept)
    db.commit()
    return {"message": "Đã xoá phòng ban thành công"}


# ==================== BỐI CẢNH & CÁC BÊN QUAN TÂM (CLAUSE 4.2) ====================

def format_party_out(p: Any) -> InterestedPartyResponse:
    return InterestedPartyResponse(
        id=int(p.id),
        party_name=str(p.party_name),
        party_type=str(p.party_type),
        needs_and_expectations=str(p.needs_and_expectations),
        statutory_requirements=str(p.statutory_requirements) if p.statutory_requirements else None,
        monitoring_method=str(p.monitoring_method) if p.monitoring_method else None,
        review_frequency=str(p.review_frequency) if p.review_frequency else None,
        responsible_role=str(p.responsible_role) if p.responsible_role else None,
        status=str(p.status) if p.status else None,
        created_at=p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else None,
        updated_at=p.updated_at.strftime("%Y-%m-%d %H:%M") if p.updated_at else None,
    )

@router.get("/interested-parties", response_model=List[InterestedPartyResponse])
def get_interested_parties(
    party_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lấy danh sách các bên quan tâm theo Điều 4.2 ISO 22000 (Phụ lục 1)"""
    query = db.query(InterestedParty)
    if party_type and party_type.upper() != "ALL":
        query = query.filter(InterestedParty.party_type == party_type.upper())
    parties = query.order_by(InterestedParty.id.asc()).all()
    return [format_party_out(p) for p in parties]

@router.post("/interested-parties", response_model=InterestedPartyResponse, status_code=status.HTTP_201_CREATED)
def create_interested_party(payload: InterestedPartyCreate, db: Session = Depends(get_db)):
    """Thêm mới bên quan tâm và nhu cầu kỳ vọng ATTP"""
    party = InterestedParty(
        party_name=payload.party_name,
        party_type=payload.party_type,
        needs_and_expectations=payload.needs_and_expectations,
        statutory_requirements=payload.statutory_requirements,
        monitoring_method=payload.monitoring_method,
        review_frequency=payload.review_frequency,
        responsible_role=payload.responsible_role,
        status=payload.status or "ACTIVE",
    )
    db.add(party)
    db.commit()
    db.refresh(party)
    return format_party_out(party)

@router.put("/interested-parties/{party_id}", response_model=InterestedPartyResponse)
def update_interested_party(party_id: int, payload: InterestedPartyUpdate, db: Session = Depends(get_db)):
    """Cập nhật bên quan tâm"""
    party = db.query(InterestedParty).filter(InterestedParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Không tìm thấy bên quan tâm")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(party, field, value)

    db.commit()
    db.refresh(party)
    return format_party_out(party)

@router.delete("/interested-parties/{party_id}")
def delete_interested_party(party_id: int, db: Session = Depends(get_db)):
    """Xóa bên quan tâm"""
    party = db.query(InterestedParty).filter(InterestedParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Không tìm thấy bên quan tâm")
    db.delete(party)
    db.commit()
    return {"message": "Đã xóa bên quan tâm thành công"}


# ==================== RỦI RO & CƠ HỘI BỐI CẢNH (CLAUSE 4.1 & 6.1) ====================

def format_risk_out(r: Any) -> ContextRiskResponse:
    target_date_str = r.target_date.strftime("%Y-%m-%d") if r.target_date else None
    return ContextRiskResponse(
        id=int(r.id),
        code=str(r.code),
        issue_category=str(r.issue_category),
        issue_description=str(r.issue_description),
        interested_party_id=int(r.interested_party_id) if r.interested_party_id is not None else None,
        party_name=str(r.interested_party.party_name) if r.interested_party and r.interested_party.party_name else None,
        risk_description=str(r.risk_description),
        opportunity_description=str(r.opportunity_description) if r.opportunity_description else None,
        likelihood=int(r.likelihood),
        severity=int(r.severity),
        risk_score=int(r.risk_score),
        treatment_strategy=str(r.treatment_strategy),
        action_plan=str(r.action_plan),
        responsible_role=str(r.responsible_role) if r.responsible_role else None,
        target_date=target_date_str,
        status=str(r.status) if r.status else None,
        residual_likelihood=int(r.residual_likelihood) if r.residual_likelihood is not None else None,
        residual_severity=int(r.residual_severity) if r.residual_severity is not None else None,
        residual_risk_score=int(r.residual_risk_score) if r.residual_risk_score is not None else None,
        created_at=r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else None,
        updated_at=r.updated_at.strftime("%Y-%m-%d %H:%M") if r.updated_at else None,
    )

@router.get("/context-risks", response_model=List[ContextRiskResponse])
def get_context_risks(
    issue_category: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lấy danh sách rủi ro và cơ hội bối cảnh theo Điều 4.1 & 6.1 (Phụ lục 2 & 4)"""
    query = db.query(ContextRisk)
    if issue_category and issue_category.upper() != "ALL":
        query = query.filter(ContextRisk.issue_category == issue_category.upper())
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(ContextRisk.status == status_filter.upper())
    risks = query.order_by(ContextRisk.risk_score.desc()).all()
    return [format_risk_out(r) for r in risks]

@router.post("/context-risks", response_model=ContextRiskResponse, status_code=status.HTTP_201_CREATED)
def create_context_risk(payload: ContextRiskCreate, db: Session = Depends(get_db)):
    """Tạo mới rủi ro/cơ hội bối cảnh tổ chức"""
    existing = db.query(ContextRisk).filter(ContextRisk.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã rủi ro đã tồn tại")

    l = max(1, min(5, payload.likelihood))
    s = max(1, min(5, payload.severity))
    score = l * s

    res_score = None
    if payload.residual_likelihood and payload.residual_severity:
        res_score = payload.residual_likelihood * payload.residual_severity

    t_date = None
    if payload.target_date:
        try:
            t_date = datetime.strptime(payload.target_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    risk = ContextRisk(
        code=payload.code,
        issue_category=payload.issue_category,
        issue_description=payload.issue_description,
        interested_party_id=payload.interested_party_id,
        risk_description=payload.risk_description,
        opportunity_description=payload.opportunity_description,
        likelihood=l,
        severity=s,
        risk_score=score,
        treatment_strategy=payload.treatment_strategy,
        action_plan=payload.action_plan,
        responsible_role=payload.responsible_role,
        target_date=t_date,
        status=payload.status or "TREATING",
        residual_likelihood=payload.residual_likelihood,
        residual_severity=payload.residual_severity,
        residual_risk_score=res_score,
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return format_risk_out(risk)

@router.put("/context-risks/{risk_id}", response_model=ContextRiskResponse)
def update_context_risk(risk_id: int, payload: ContextRiskUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin rủi ro/cơ hội bối cảnh"""
    risk = db.query(ContextRisk).filter(ContextRisk.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Không tìm thấy rủi ro bối cảnh")

    data = payload.model_dump(exclude_unset=True)
    if "target_date" in data:
        target_date_val = None
        if data["target_date"]:
            try:
                target_date_val = datetime.strptime(data["target_date"], "%Y-%m-%d").date()
            except ValueError:
                target_date_val = None
        del data["target_date"]
        setattr(risk, "target_date", target_date_val)

    for field, value in data.items():
        setattr(risk, field, value)

    curr_likelihood = int(getattr(risk, "likelihood") or 1)
    curr_severity = int(getattr(risk, "severity") or 1)
    setattr(risk, "risk_score", curr_likelihood * curr_severity)

    res_l = getattr(risk, "residual_likelihood", None)
    res_s = getattr(risk, "residual_severity", None)
    if res_l is not None and res_s is not None:
        setattr(risk, "residual_risk_score", int(res_l) * int(res_s))

    db.commit()
    db.refresh(risk)
    return format_risk_out(risk)

@router.delete("/context-risks/{risk_id}")
def delete_context_risk(risk_id: int, db: Session = Depends(get_db)):
    """Xóa rủi ro bối cảnh"""
    risk = db.query(ContextRisk).filter(ContextRisk.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Không tìm thấy rủi ro bối cảnh")
    db.delete(risk)
    db.commit()
    return {"message": "Đã xóa rủi ro bối cảnh thành công"}


# ==================== CONTEXT STATS ====================

@router.get("/context-stats", response_model=ContextStatsResponse)
def get_context_stats(db: Session = Depends(get_db)):
    """Thống kê tổng quan bối cảnh tổ chức & rủi ro"""
    total_parties = db.query(InterestedParty).count()
    internal_parties = db.query(InterestedParty).filter(InterestedParty.party_type == "INTERNAL").count()
    external_parties = total_parties - internal_parties

    total_risks = db.query(ContextRisk).count()
    high_risks = db.query(ContextRisk).filter(ContextRisk.risk_score >= 12).count()
    controlled_risks = db.query(ContextRisk).filter(ContextRisk.status.in_(["CONTROLLED", "CLOSED"])).count()

    return ContextStatsResponse(
        total_parties=total_parties,
        internal_parties=internal_parties,
        external_parties=external_parties,
        total_risks=total_risks,
        high_risks=high_risks,
        controlled_risks=controlled_risks,
    )


# ==================== TRAO ĐỔI THÔNG TIN (CLAUSE 7.4) ====================

def format_comm_out(c: Any) -> CommunicationLogResponse:
    return CommunicationLogResponse(
        comm_id=c.comm_id,
        comm_code=str(c.comm_code),
        direction=str(c.direction),
        party_type=str(c.party_type),
        party_name=str(c.party_name),
        subject=str(c.subject),
        content=str(c.content),
        communication_date=c.communication_date,
        method=str(c.method or "EMAIL"),
        responsible_person=str(c.responsible_person),
        related_nc_id=c.related_nc_id,
        attachment_url=str(c.attachment_url) if c.attachment_url else None,
        status=str(c.status),
        created_at=c.created_at,
    )

@router.get("/communications", response_model=List[CommunicationLogResponse])
def get_communications(
    direction: Optional[str] = None,
    party_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(CommunicationLog)
    if direction and direction != "ALL":
        query = query.filter(CommunicationLog.direction == direction)
    if party_type and party_type != "ALL":
        query = query.filter(CommunicationLog.party_type == party_type)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (CommunicationLog.comm_code.ilike(s))
            | (CommunicationLog.party_name.ilike(s))
            | (CommunicationLog.subject.ilike(s))
        )
    comms = query.order_by(CommunicationLog.communication_date.desc()).all()
    return [format_comm_out(c) for c in comms]

@router.post("/communications", response_model=CommunicationLogResponse, status_code=status.HTTP_201_CREATED)
def create_communication(payload: CommunicationLogCreate, db: Session = Depends(get_db)):
    code = payload.comm_code
    if not code:
        year = payload.communication_date.year if payload.communication_date else datetime.now().year
        count = db.query(CommunicationLog).count() + 1
        code = f"COMM-{year}-{count:03d}"

    comm = CommunicationLog(
        comm_code=code,
        direction=payload.direction,
        party_type=payload.party_type,
        party_name=payload.party_name,
        subject=payload.subject,
        content=payload.content,
        communication_date=payload.communication_date,
        method=payload.method,
        responsible_person=payload.responsible_person,
        related_nc_id=payload.related_nc_id,
        attachment_url=payload.attachment_url,
        status=payload.status,
    )
    db.add(comm)
    db.commit()
    db.refresh(comm)
    return format_comm_out(comm)

@router.put("/communications/{comm_id}", response_model=CommunicationLogResponse)
def update_communication(comm_id: uuid.UUID, payload: CommunicationLogUpdate, db: Session = Depends(get_db)):
    comm = db.query(CommunicationLog).filter(CommunicationLog.comm_id == comm_id).first()
    if not comm:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký trao đổi thông tin")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(comm, field, value)

    db.commit()
    db.refresh(comm)
    return format_comm_out(comm)

@router.delete("/communications/{comm_id}")
def delete_communication(comm_id: uuid.UUID, db: Session = Depends(get_db)):
    comm = db.query(CommunicationLog).filter(CommunicationLog.comm_id == comm_id).first()
    if not comm:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký trao đổi thông tin")
    db.delete(comm)
    db.commit()
    return {"message": "Đã xóa nhật ký trao đổi thông tin thành công"}


# ==================== ĐỘI AN TOÀN THỰC PHẨM (CLAUSE 5.3) ====================

def format_fst_out(m: Any) -> FoodSafetyTeamMemberResponse:
    role_map = {
        "TEAM_LEADER": "Đội trưởng",
        "VICE_LEADER": "Đội phó",
        "SECRETARY": "Thư ký",
        "MEMBER": "Đội viên",
    }
    role_str = str(m.role_in_team)
    role_vi = role_map.get(role_str, role_str)

    return FoodSafetyTeamMemberResponse(
        member_id=m.member_id,
        id=m.member_id,
        user_id=m.user_id,
        member_name=str(m.member_name),
        full_name=str(m.member_name),
        role_in_team=role_str,
        role=role_vi,
        department=str(m.department),
        current_position=str(m.current_position),
        job_title=str(m.current_position),
        qualification_and_training=str(m.qualification_and_training) if m.qualification_and_training else None,
        qualification=str(m.qualification_and_training) if m.qualification_and_training else None,
        responsibility_description=str(m.responsibility_description),
        responsibilities=str(m.responsibility_description),
        appointment_decision_code=str(m.appointment_decision_code) if m.appointment_decision_code else None,
        decision_number=str(m.appointment_decision_code) if m.appointment_decision_code else None,
        appointment_date=m.appointment_date,
        decision_date=m.appointment_date,
        status=str(m.status) if m.status else None,
        created_at=m.created_at,
    )

@router.get("/food-safety-team", response_model=List[FoodSafetyTeamMemberResponse])
def get_food_safety_team(
    role_in_team: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(FoodSafetyTeamMember)
    if role_in_team and role_in_team != "ALL":
        query = query.filter(FoodSafetyTeamMember.role_in_team == role_in_team)
    members = query.all()
    role_order = {"TEAM_LEADER": 1, "VICE_LEADER": 2, "SECRETARY": 3, "MEMBER": 4}
    members.sort(key=lambda x: (role_order.get(str(getattr(x, "role_in_team", "")), 99), str(getattr(x, "member_name", ""))))
    return [format_fst_out(m) for m in members]

@router.post("/food-safety-team", response_model=FoodSafetyTeamMemberResponse, status_code=status.HTTP_201_CREATED)
def create_food_safety_team_member(payload: FoodSafetyTeamMemberCreate, db: Session = Depends(get_db)):
    role_raw = payload.role_in_team or payload.role or "MEMBER"
    role_reverse_map = {
        "Đội trưởng": "TEAM_LEADER",
        "Đội phó": "VICE_LEADER",
        "Thư ký": "SECRETARY",
        "Đội viên": "MEMBER",
    }
    role_in_team = role_reverse_map.get(role_raw, role_raw)

    member_name = payload.member_name or payload.full_name or ""
    current_position = payload.current_position or payload.job_title or ""
    qualification = payload.qualification_and_training or payload.qualification
    responsibility = payload.responsibility_description or payload.responsibilities or ""
    decision_code = payload.appointment_decision_code or payload.decision_number or "02/QĐ-ATTP-2026"
    appt_date = payload.appointment_date or payload.decision_date or date.today()
    if isinstance(appt_date, str):
        try:
            appt_date = date.fromisoformat(appt_date)
        except Exception:
            appt_date = date.today()

    member = FoodSafetyTeamMember(
        user_id=payload.user_id,
        member_name=member_name,
        role_in_team=role_in_team,
        department=payload.department or "",
        current_position=current_position,
        qualification_and_training=qualification,
        responsibility_description=responsibility,
        appointment_decision_code=decision_code,
        appointment_date=appt_date,
        status=payload.status or "ACTIVE",
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return format_fst_out(member)

@router.put("/food-safety-team/{member_id}", response_model=FoodSafetyTeamMemberResponse)
def update_food_safety_team_member(
    member_id: uuid.UUID, payload: FoodSafetyTeamMemberUpdate, db: Session = Depends(get_db)
):
    member = db.query(FoodSafetyTeamMember).filter(FoodSafetyTeamMember.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên đội ATTP")

    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data and "member_name" not in data:
        data["member_name"] = data.pop("full_name")
    if "job_title" in data and "current_position" not in data:
        data["current_position"] = data.pop("job_title")
    if "qualification" in data and "qualification_and_training" not in data:
        data["qualification_and_training"] = data.pop("qualification")
    if "responsibilities" in data and "responsibility_description" not in data:
        data["responsibility_description"] = data.pop("responsibilities")
    if "decision_number" in data and "appointment_decision_code" not in data:
        data["appointment_decision_code"] = data.pop("decision_number")
    if "decision_date" in data and "appointment_date" not in data:
        d = data.pop("decision_date")
        if isinstance(d, str):
            try:
                d = date.fromisoformat(d)
            except Exception:
                d = None
        data["appointment_date"] = d
    if "role" in data and "role_in_team" not in data:
        r = data.pop("role")
        role_reverse_map = {
            "Đội trưởng": "TEAM_LEADER",
            "Đội phó": "VICE_LEADER",
            "Thư ký": "SECRETARY",
            "Đội viên": "MEMBER",
        }
        data["role_in_team"] = role_reverse_map.get(r, r)
    elif "role_in_team" in data:
        role_reverse_map = {
            "Đội trưởng": "TEAM_LEADER",
            "Đội phó": "VICE_LEADER",
            "Thư ký": "SECRETARY",
            "Đội viên": "MEMBER",
        }
        data["role_in_team"] = role_reverse_map.get(data["role_in_team"], data["role_in_team"])

    for field, value in data.items():
        if hasattr(member, field) and value is not None:
            setattr(member, field, value)

    db.commit()
    db.refresh(member)
    return format_fst_out(member)

@router.delete("/food-safety-team/{member_id}")
def delete_food_safety_team_member(member_id: uuid.UUID, db: Session = Depends(get_db)):
    member = db.query(FoodSafetyTeamMember).filter(FoodSafetyTeamMember.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên đội ATTP")
    db.delete(member)
    db.commit()
    return {"message": "Đã xóa thành viên khỏi đội ATTP thành công"}
