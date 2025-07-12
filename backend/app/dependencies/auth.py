# workshop-main/backend/app/dependencies/auth.py

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError, BaseModel, EmailStr # Keep EmailStr if used elsewhere

from passlib.context import CryptContext

from sqlmodel import Session, select # Needed for database operations here

from ..schemas import User, TokenData # Import User and TokenData from your schemas
from ..database import get_session # Import get_session from your database.py

# --- Configuration Settings ---
# This class defines the application settings, loaded from environment variables.
class Settings(BaseModel):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-for-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    # DATABASE_URL and FRONTEND_URL are typically used in main.py for engine and CORS,
    # but SECRET_KEY and ALGORITHM are crucial here for JWT.
    # Keeping them all here for consistency if main.py imports settings directly.
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./database.db")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

settings = Settings()

# --- Password Hashing Context ---
# Configures the password hashing algorithm (bcrypt is recommended).
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- OAuth2PasswordBearer for token extraction ---
# Defines how the OAuth2 token (Bearer token) is expected to be found in requests.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token") # Ensure this matches your login endpoint

# --- Password Utility Functions ---
# Verifies a plain password against a hashed password.
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Hashes a plain password.
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# --- User Authentication Function ---
# Authenticates a user by email and password against the database.
def authenticate_user(session: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticates a user against the database.
    Returns the User object if successful, None otherwise.
    """
    user = session.exec(select(User).where(User.email == email)).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

# --- JWT Utility Functions ---
# Creates a JWT access token.
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# --- Dependency to get the current user from the token ---
# This function extracts the user from the JWT token in the request header.
async def get_current_user(
    session: Session = Depends(get_session),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        # The 'sub' (subject) claim in our token stores the user's ID (UUID string)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id) # Validate with TokenData schema
    except (JWTError, ValidationError): # Catch both JWT decoding errors and Pydantic validation errors
        raise credentials_exception

    user = session.exec(select(User).where(User.id == token_data.user_id)).first()
    if user is None:
        raise credentials_exception
    return user

# --- Dependency to get the current active user ---
# This dependency ensures the user is not only authenticated but also active.
async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user
