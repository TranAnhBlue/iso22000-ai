from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User, Role, Department
from app.models.organization import InterestedParty, ContextRisk
from app.schemas.organization import (
    UserOut, UserCreate, UserUpdate,
    DepartmentOut, DepartmentCreate, DepartmentUpdate,
    InterestedPartyCreate, InterestedPartyUpdate, InterestedPartyResponse,
    ContextRiskCreate, ContextRiskUpdate, ContextRiskResponse, ContextStatsResponse
)
from typing import List, Optional
from datetime import datetime, date

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
        count=int(count),
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
        # Cập nhật tên phòng ban cho người dùng đang thuộc phòng này
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
    
    # Cập nhật phòng ban của nhân viên về "Chờ phân bổ"
    db.query(User).filter(User.department == dept.dept_name).update({User.department: "Chờ phân bổ"})
    db.delete(dept)
    db.commit()
    return {"message": "Đã xoá phòng ban thành công"}


# ==================== BỐI CẢNH & CÁC BÊN QUAN TÂM (CLAUSE 4.2) ====================

def format_party_out(p: InterestedParty) -> InterestedPartyResponse:
    return InterestedPartyResponse(
        id=p.id,
        party_name=p.party_name,
        party_type=p.party_type,
        needs_and_expectations=p.needs_and_expectations,
        statutory_requirements=p.statutory_requirements,
        monitoring_method=p.monitoring_method,
        review_frequency=p.review_frequency,
        responsible_role=p.responsible_role,
        status=p.status,
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

def format_risk_out(r: ContextRisk) -> ContextRiskResponse:
    target_date_str = r.target_date.strftime("%Y-%m-%d") if r.target_date else None
    return ContextRiskResponse(
        id=r.id,
        code=r.code,
        issue_category=r.issue_category,
        issue_description=r.issue_description,
        interested_party_id=r.interested_party_id,
        party_name=r.interested_party.party_name if r.interested_party else None,
        risk_description=r.risk_description,
        opportunity_description=r.opportunity_description,
        likelihood=r.likelihood,
        severity=r.severity,
        risk_score=r.risk_score,
        treatment_strategy=r.treatment_strategy,
        action_plan=r.action_plan,
        responsible_role=r.responsible_role,
        target_date=target_date_str,
        status=r.status,
        residual_likelihood=r.residual_likelihood,
        residual_severity=r.residual_severity,
        residual_risk_score=r.residual_risk_score,
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
        if data["target_date"]:
            try:
                risk.target_date = datetime.strptime(data["target_date"], "%Y-%m-%d").date()
            except ValueError:
                pass
        else:
            risk.target_date = None
        del data["target_date"]

    for field, value in data.items():
        setattr(risk, field, value)

    # Tính toán lại risk_score
    risk.risk_score = risk.likelihood * risk.severity
    if risk.residual_likelihood and risk.residual_severity:
        risk.residual_risk_score = risk.residual_likelihood * risk.residual_severity

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