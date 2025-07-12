# workshop-main/backend/app/routes/users.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List

# Import authentication dependencies from your new centralized location
from ..dependencies.auth import get_current_user # This replaces 'verify_token'
from ..schemas import User, UserResponse # Import User and UserResponse from your schemas
from ..database import get_session # Import get_session from your database.py

router = APIRouter()

# Example: Get current user details
@router.get("/me", response_model=UserResponse, summary="Get current user details")
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Retrieve details of the current authenticated user.
    """
    return UserResponse(id=str(current_user.id), email=current_user.email, is_active=current_user.is_active)

# Example: Get user by ID (requires admin or special permission, here just showing general access)
# You might want to add a dependency here for admin users, e.g.,
# get_current_active_admin_user: User = Depends(get_current_active_admin_user)
@router.get("/{user_id}", response_model=UserResponse, summary="Get user by ID")
async def read_user_by_id(user_id: str, session: Session = Depends(get_session)):
    """
    Retrieve details of a user by their ID.
    Note: In a real application, access to this endpoint would be restricted.
    """
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse(id=str(user.id), email=user.email, is_active=user.is_active)

# Example: Get all users (requires admin or special permission)
@router.get("/", response_model=List[UserResponse], summary="Get all users")
async def read_all_users(session: Session = Depends(get_session)):
    """
    Retrieve details of all users.
    Note: In a real application, this endpoint would require admin privileges.
    """
    users = session.exec(select(User)).all()
    return [UserResponse(id=str(user.id), email=user.email, is_active=user.is_active) for user in users]

# You might have other user-related endpoints here (e.g., update user profile)