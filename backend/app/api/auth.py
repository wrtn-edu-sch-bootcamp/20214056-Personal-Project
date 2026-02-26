"""Authentication endpoints: register, login, current user."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User, Company
from app.models.schemas import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_response(user: User) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, name=user.name, role=user.role)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new user account and return a JWT."""
    # Validate role
    if req.role not in ("candidate", "company"):
        raise HTTPException(status_code=400, detail="role must be 'candidate' or 'company'")

    # Company registration requires company_name
    if req.role == "company" and not (req.company_name or "").strip():
        raise HTTPException(status_code=400, detail="company_name is required for company accounts")

    # Check for duplicate email
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        name=req.name,
        role=req.role,
    )
    db.add(user)
    await db.flush()  # generate user.id before creating Company

    # Auto-create Company profile for company accounts
    if req.role == "company":
        company = Company(
            user_id=user.id,
            name=req.company_name.strip(),  # type: ignore[union-attr]
        )
        db.add(company)

    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=_user_response(user))


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email/password and return a JWT."""
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=_user_response(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's info."""
    return _user_response(current_user)
