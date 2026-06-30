from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.limiter import limiter
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import TokenOut, UserCreate, UserLogin, UserOut
from app.services.captcha import verify_recaptcha

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/config")
async def auth_config():
    return {"recaptcha_site_key": settings.recaptcha_site_key}


@router.post("/signup", response_model=TokenOut)
@limiter.limit("10/minute")
async def signup(request: Request, payload: UserCreate, db: Annotated[Session, Depends(get_db)]):
    if not await verify_recaptcha(payload.captcha_token):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Captcha verification failed")

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenOut(
        access_token=create_access_token(user.id),
        user=UserOut.model_validate(user),
        recaptcha_site_key=settings.recaptcha_site_key,
    )


@router.post("/login", response_model=TokenOut)
@limiter.limit("10/minute")
async def login(request: Request, payload: UserLogin, db: Annotated[Session, Depends(get_db)]):
    if not await verify_recaptcha(payload.captcha_token):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Captcha verification failed")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    return TokenOut(
        access_token=create_access_token(user.id),
        user=UserOut.model_validate(user),
        recaptcha_site_key=settings.recaptcha_site_key,
    )


@router.post("/demo-official", response_model=TokenOut)
async def demo_official_login(db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.email == "official@civicpulse.gov").first()
    if not user:
        user = User(
            email="official@civicpulse.gov",
            name="Demo Official",
            hashed_password=hash_password("demo1234"),
            is_official=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return TokenOut(
        access_token=create_access_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user
