# workshop-main/backend/app/routes/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import timedelta

# --- THESE ARE THE CRITICAL IMPORTS THAT NEED TO BE CORRECT ---
# Import utilities and settings from your new centralized location
from ..dependencies.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    settings # Import settings for ACCESS_TOKEN_EXPIRE_MINUTES
)

# Import your schemas
from ..schemas import UserCreate, UserLogin, UserResponse, Token, TokenData, User # Ensure User is imported
from ..database import get_session # Import get_session from your database.py
# -------------------------------------------------------------

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Register a new user")
async def register_user(user_data: UserCreate, session: Session = Depends(get_session)):
    """
    Registers a new user with the provided email and password.
    """
    existing_user = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(user_data.password)

    db_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        is_active=True # Default is_active to True
    )

    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    return UserResponse(id=str(db_user.id), email=db_user.email, is_active=db_user.is_active)


@router.post("/token", response_model=Token, summary="Obtain JWT token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    """
    Authenticate a user and return an access token.
    Uses OAuth2PasswordRequestForm for username (email) and password.
    """
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, # Use user.id (UUID string) as the subject
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}