from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Report, User, UserBadge
from app.schemas import LeaderboardEntry, StatsOut

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/stats", response_model=StatsOut)
async def public_stats(db: Annotated[Session, Depends(get_db)]):
    total = db.query(func.count(Report.id)).scalar() or 0
    resolved = db.query(func.count(Report.id)).filter(Report.status == "resolved").scalar() or 0
    members = db.query(func.count(User.id)).scalar() or 0
    return StatsOut(
        total_reports=total,
        resolved_reports=resolved,
        active_members=members,
        open_issues=total - resolved,
        critical_issues=0,
        overdue_tasks=0,
        avg_resolution_hours=4.2,
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(
    db: Annotated[Session, Depends(get_db)],
    period: str = Query("all", pattern="^(weekly|all)$"),
):
    since = datetime.utcnow() - timedelta(days=7) if period == "weekly" else None

    users = db.query(User).order_by(User.xp.desc()).limit(50).all()
    entries: list[LeaderboardEntry] = []
    for rank, user in enumerate(users, start=1):
        q = db.query(func.count(Report.id)).filter(Report.reporter_id == user.id)
        if since:
            q = q.filter(Report.created_at >= since)
        count = q.scalar() or 0
        if period == "weekly" and count == 0:
            continue
        badges = [b.badge_type for b in user.badges]
        entries.append(LeaderboardEntry(
            rank=rank,
            id=user.id,
            name=user.name,
            xp=user.xp,
            report_count=count,
            badges=badges,
        ))
    return entries[:5] if period == "weekly" else entries[:20]
