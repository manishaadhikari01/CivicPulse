from sqlalchemy.orm import Session

from app.models import Report, ReportStatus, User, UserBadge


def award_xp(db: Session, user: User, amount: int) -> None:
    user.xp += amount


def check_and_award_badges(db: Session, user: User) -> list[str]:
    report_count = db.query(Report).filter(Report.reporter_id == user.id).count()
    earned: list[str] = []
    badge_rules = [
        ("first_report", report_count >= 1),
        ("five_reports", report_count >= 5),
        ("neighborhood_hero", report_count >= 10),
    ]
    existing = {b.badge_type for b in user.badges}
    for badge_type, condition in badge_rules:
        if condition and badge_type not in existing:
            db.add(UserBadge(user_id=user.id, badge_type=badge_type))
            earned.append(badge_type)
    return earned


def on_report_verified(db: Session, user: User, report: Report) -> None:
    if report.xp_awarded:
        return
    award_xp(db, user, 10)
    report.xp_awarded = True
    check_and_award_badges(db, user)


def on_report_resolved(db: Session, user: User) -> None:
    award_xp(db, user, 5)
