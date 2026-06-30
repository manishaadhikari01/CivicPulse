from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CaptchaPayload(BaseModel):
    captcha_token: str = Field(..., min_length=1)


class UserCreate(CaptchaPayload):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=120)
    password: str = Field(..., min_length=6)


class UserLogin(CaptchaPayload):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    xp: int
    is_official: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    recaptcha_site_key: str = ""


class DuplicateInfo(BaseModel):
    report_id: int
    title: str
    distance: float
    severity: str
    supporter_count: int
    status: str


class AIAnalysisOut(BaseModel):
    issue_detected: bool = True
    issue_type: str
    category: str = ""
    severity: str
    department: str
    confidence: float
    title: str
    description: str
    reason: str = ""
    mock: bool = False
    duplicate_found: bool = False
    duplicate: DuplicateInfo | None = None


class ReportCreate(BaseModel):
    title: str
    description: str
    issue_type: str
    severity: str
    department: str
    confidence: float = 0.0
    latitude: float
    longitude: float
    location_text: str
    zone: str = "Dehradun"


class ReportUpdateCreate(BaseModel):
    content: str = Field(..., min_length=1)


class StatusUpdate(BaseModel):
    status: str


class ReportOut(BaseModel):
    id: int
    title: str
    description: str
    issue_type: str
    severity: str
    department: str
    status: str
    confidence: float
    image_url: str | None
    latitude: float
    longitude: float
    location_text: str
    zone: str
    upvotes: int
    supporter_count: int = 0
    reporter_id: int
    reporter_name: str = ""
    created_at: datetime
    last_updated: datetime | None = None
    resolved_at: datetime | None
    sla_hours: int = 72
    sla_remaining_seconds: int | None = None
    evidence_images: list[str] = []

    model_config = {"from_attributes": True}


class SupportResponse(BaseModel):
    supported: bool
    supporter_count: int
    already_supported: bool = False


class LeaderboardEntry(BaseModel):
    rank: int
    id: int
    name: str
    xp: int
    report_count: int
    badges: list[str]


class StatsOut(BaseModel):
    total_reports: int
    resolved_reports: int
    active_members: int
    open_issues: int
    critical_issues: int
    overdue_tasks: int
    avg_resolution_hours: float
