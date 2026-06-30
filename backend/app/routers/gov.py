from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Report, ReportStatus, ReportUpdate, SLA_HOURS, Severity, User
from app.routers.reports import _sla_remaining, _to_out
from app.schemas import ReportOut, StatsOut, StatusUpdate
from app.services.gamification import on_report_resolved

router = APIRouter(prefix="/api/gov", tags=["government"])


def _require_official(user: User) -> None:
    if not user.is_official:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Official access required")


@router.get("/stats", response_model=StatsOut)
async def gov_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_official(current_user)
    total = db.query(func.count(Report.id)).scalar() or 0
    resolved = db.query(func.count(Report.id)).filter(Report.status == ReportStatus.RESOLVED.value).scalar() or 0
    open_count = db.query(func.count(Report.id)).filter(Report.status != ReportStatus.RESOLVED.value).scalar() or 0
    critical = db.query(func.count(Report.id)).filter(
        Report.severity == Severity.CRITICAL.value,
        Report.status != ReportStatus.RESOLVED.value,
    ).scalar() or 0

    overdue = 0
    active = db.query(Report).filter(Report.status != ReportStatus.RESOLVED.value).all()
    for r in active:
        remaining = _sla_remaining(r)
        if remaining is not None and remaining <= 0:
            overdue += 1

    resolved_reports = db.query(Report).filter(Report.resolved_at.isnot(None)).all()
    avg_hours = 0.0
    if resolved_reports:
        deltas = [(r.resolved_at - r.created_at).total_seconds() / 3600 for r in resolved_reports if r.resolved_at]
        avg_hours = sum(deltas) / len(deltas) if deltas else 0.0

    members = db.query(func.count(User.id)).scalar() or 0

    return StatsOut(
        total_reports=total,
        resolved_reports=resolved,
        active_members=members,
        open_issues=open_count,
        critical_issues=critical,
        overdue_tasks=overdue,
        avg_resolution_hours=round(avg_hours, 1),
    )


@router.get("/reports", response_model=list[ReportOut])
async def gov_reports(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    department: str | None = None,
):
    _require_official(current_user)
    q = db.query(Report).filter(Report.status != ReportStatus.RESOLVED.value).order_by(Report.created_at.desc())
    if department:
        q = q.filter(Report.department == department)
    return [_to_out(r) for r in q.all()]


@router.patch("/reports/{report_id}/status", response_model=ReportOut)
async def update_status(
    report_id: int,
    payload: StatusUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_official(current_user)
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")

    valid = {s.value for s in ReportStatus}
    if payload.status not in valid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Status must be one of {valid}")

    was_resolved = report.status == ReportStatus.RESOLVED.value
    report.status = payload.status
    if payload.status == ReportStatus.RESOLVED.value and not report.resolved_at:
        report.resolved_at = datetime.utcnow()
        if not was_resolved:
            on_report_resolved(db, report.reporter)
            db.add(ReportUpdate(
                report_id=report.id,
                author_id=current_user.id,
                content="Issue marked as resolved by municipal team.",
                is_ai=False,
            ))
    db.commit()
    db.refresh(report)
    return _to_out(report)
