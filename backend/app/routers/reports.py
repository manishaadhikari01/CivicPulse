import os
import uuid
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_optional_user
from app.database import get_db
from app.models import Report, ReportEvidence, ReportStatus, ReportSupport, ReportUpdate, SEVERITY_RANK, SLA_HOURS, Severity, User
from app.schemas import AIAnalysisOut, DuplicateInfo, ReportCreate, ReportOut, ReportUpdateCreate, StatusUpdate, SupportResponse
from app.services.ai import analyze_issue_image
from app.services.duplicates import find_duplicate_report
from app.services.gamification import on_report_resolved, on_report_verified

router = APIRouter(prefix="/api/reports", tags=["reports"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _sla_remaining(report: Report) -> int | None:
    if report.status == ReportStatus.RESOLVED.value:
        return None
    try:
        severity = Severity(report.severity)
    except ValueError:
        severity = Severity.MEDIUM
    deadline = report.created_at + timedelta(hours=SLA_HOURS[severity])
    return max(0, int((deadline - datetime.utcnow()).total_seconds()))


def _to_out(report: Report) -> ReportOut:
    try:
        severity = Severity(report.severity)
    except ValueError:
        severity = Severity.MEDIUM
    # Collect evidence image URLs (most recent first)
    evidence_images = [e.image_url for e in (report.evidence or [])]
    return ReportOut(
        id=report.id,
        title=report.title,
        description=report.description,
        issue_type=report.issue_type,
        severity=report.severity,
        department=report.department,
        status=report.status,
        confidence=report.confidence,
        image_url=report.image_url,
        latitude=report.latitude,
        longitude=report.longitude,
        location_text=report.location_text,
        zone=report.zone,
        upvotes=report.upvotes,
        supporter_count=report.supporter_count or 0,
        reporter_id=report.reporter_id,
        reporter_name=report.reporter.name if report.reporter else "",
        created_at=report.created_at,
        last_updated=report.last_updated,
        resolved_at=report.resolved_at,
        sla_hours=SLA_HOURS[severity],
        sla_remaining_seconds=_sla_remaining(report),
        evidence_images=evidence_images,
    )


@router.post("/analyze", response_model=AIAnalysisOut)
async def analyze_image(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
):
    content = await file.read()
    mime = file.content_type or "image/jpeg"
    result = await analyze_issue_image(content, mime)

    duplicate = None
    duplicate_found = False
    if result.get("issue_detected") and latitude is not None and longitude is not None:
        match = find_duplicate_report(
            db,
            category=result.get("category") or result.get("issue_type", ""),
            latitude=latitude,
            longitude=longitude,
        )
        if match:
            duplicate_found = True
            duplicate = DuplicateInfo(
                report_id=match["report_id"],
                title=match["title"],
                distance=match["distance"],
                severity=match["severity"],
                supporter_count=match["supporter_count"],
                status=match["status"],
            )

    return AIAnalysisOut(**result, duplicate_found=duplicate_found, duplicate=duplicate)


def _reject_invalid_report(issue_type: str, severity: str, department: str) -> None:
    if (
        issue_type.lower() in {"", "none", "-"}
        or severity.lower() in {"", "none", "-"}
        or department in {"", "-", "none"}
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No reportable civic infrastructure issue detected. Please upload a valid issue photo.",
        )


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def create_report(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    title: str = Form(...),
    description: str = Form(...),
    issue_type: str = Form(...),
    severity: str = Form(...),
    department: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    location_text: str = Form(...),
    zone: str = Form("Dehradun"),
    confidence: float = Form(0.0),
    image: UploadFile | None = File(None),
):
    _reject_invalid_report(issue_type, severity, department)

    image_url = None
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(UPLOAD_DIR, filename)
        with open(path, "wb") as f:
            f.write(await image.read())
        image_url = f"/uploads/{filename}"

    report = Report(
        title=title,
        description=description,
        issue_type=issue_type,
        severity=severity,
        department=department,
        confidence=confidence,
        latitude=latitude,
        longitude=longitude,
        location_text=location_text,
        zone=zone,
        image_url=image_url,
        reporter_id=current_user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    on_report_verified(db, current_user, report)
    db.add(ReportUpdate(
        report_id=report.id,
        author_id=current_user.id,
        content=f"Issue detected as {report.severity}-priority {report.issue_type.lower()}. Routed to {report.department}.",
        is_ai=True,
    ))
    db.commit()
    db.refresh(report)
    return _to_out(report)


@router.get("", response_model=list[ReportOut])
async def list_reports(
    db: Annotated[Session, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
    issue_type: str | None = None,
    department: str | None = None,
    limit: int = Query(50, le=200),
):

    q = db.query(Report).order_by(Report.created_at.desc())
    if status_filter:
        q = q.filter(Report.status == status_filter)
    if issue_type:
        q = q.filter(Report.issue_type.ilike(f"%{issue_type}%"))
    if department:
        q = q.filter(Report.department == department)
    return [_to_out(r) for r in q.limit(limit).all()]


@router.get("/me", response_model=list[ReportOut])
async def my_reports(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    reports = (
        db.query(Report)
        .filter(Report.reporter_id == current_user.id)
        .order_by(Report.created_at.desc())
        .all()
    )
    return [_to_out(report) for report in reports]


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(report_id: int, db: Annotated[Session, Depends(get_db)]):

    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    return _to_out(report)


@router.get("/{report_id}/updates")
async def get_updates(report_id: int, db: Annotated[Session, Depends(get_db)]):
    updates = (
        db.query(ReportUpdate)
        .filter(ReportUpdate.report_id == report_id)
        .order_by(ReportUpdate.created_at.asc())
        .all()
    )
    return [
        {
            "id": u.id,
            "content": u.content,
            "is_ai": u.is_ai,
            "created_at": u.created_at,
            "author_id": u.author_id,
        }
        for u in updates
    ]


@router.post("/{report_id}/updates")
async def post_update(
    report_id: int,
    payload: ReportUpdateCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    update = ReportUpdate(report_id=report_id, author_id=current_user.id, content=payload.content)
    db.add(update)
    db.commit()
    return {"ok": True}


@router.post("/{report_id}/upvote")
async def upvote(
    report_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    report.upvotes += 1
    db.commit()
    return {"upvotes": report.upvotes}


@router.post("/{report_id}/support", response_model=SupportResponse)
async def support_report(
    report_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    severity: str | None = Form(None),
    image: UploadFile | None = File(None),
):
    """Support an existing report: upload extra evidence, increment supporter_count,
    optionally upgrade severity, prevent double-supporting by the same user."""
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")

    # Prevent the same user supporting more than once
    already = (
        db.query(ReportSupport)
        .filter(ReportSupport.report_id == report_id, ReportSupport.user_id == current_user.id)
        .first()
    )
    if already:
        return SupportResponse(supported=False, supporter_count=report.supporter_count or 0, already_supported=True)

    # Save new evidence image if provided
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(UPLOAD_DIR, filename)
        with open(path, "wb") as f:
            f.write(await image.read())
        evidence_url = f"/uploads/{filename}"
        db.add(ReportEvidence(
            report_id=report_id,
            uploader_id=current_user.id,
            image_url=evidence_url,
        ))

    # Upgrade severity if AI estimated a higher one
    if severity and severity in SEVERITY_RANK:
        current_rank = SEVERITY_RANK.get(report.severity, 0)
        new_rank = SEVERITY_RANK.get(severity, 0)
        if new_rank > current_rank:
            report.severity = severity

    # Increment supporter count and record support
    report.supporter_count = (report.supporter_count or 0) + 1
    report.last_updated = datetime.utcnow()
    db.add(ReportSupport(report_id=report_id, user_id=current_user.id))
    db.commit()
    db.refresh(report)

    return SupportResponse(supported=True, supporter_count=report.supporter_count)
