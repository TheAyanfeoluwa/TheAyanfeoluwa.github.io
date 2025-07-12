# workshop-main/backend/app/routes/channels.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional

# Import authentication dependencies from your new centralized location
from ..dependencies.auth import get_current_user # Assuming verify_token maps to get_current_user
# Import your schemas (ensure Channel, ChannelCreate, User are imported)
from ..schemas import Channel, ChannelCreate, ChannelResponse, User # Add ChannelResponse if you have one
from ..database import get_session # Import get_session from your database.py

router = APIRouter()

# --- Channel In-Memory Store (if not using SQLModel for channels yet) ---
# If your channels are also SQLModels, you'd fetch them from the session.
# For now, let's assume an in-memory placeholder if the AI provided one.
# If your actual channels.py uses SQLModel, ensure you adapt this part.
# This part is a placeholder based on common AI responses for these files.
fake_channel_db = [] # Placeholder for channels, assuming they are SQLModels later


# --- Channel Endpoints ---

@router.post("/", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED, summary="Create a new channel")
async def create_channel(
    channel_create: ChannelCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create a new channel. Only authenticated users can create channels.
    """
    # Create a new Channel SQLModel instance
    db_channel = Channel(
        name=channel_create.name,
        description=channel_create.description,
        owner_id=current_user.id # Assign the current user as the owner
    )
    session.add(db_channel)
    session.commit()
    session.refresh(db_channel)
    return ChannelResponse(
        id=str(db_channel.id),
        name=db_channel.name,
        description=db_channel.description,
        owner_id=str(db_channel.owner_id)
    )

@router.get("/", response_model=List[ChannelResponse], summary="Get all channels")
async def get_all_channels(session: Session = Depends(get_session)):
    """
    Retrieve all available channels.
    """
    channels = session.exec(select(Channel)).all()
    return [
        ChannelResponse(
            id=str(channel.id),
            name=channel.name,
            description=channel.description,
            owner_id=str(channel.owner_id)
        )
        for channel in channels
    ]

@router.get("/{channel_id}", response_model=ChannelResponse, summary="Get channel by ID")
async def get_channel_by_id(channel_id: str, session: Session = Depends(get_session)):
    """
    Retrieve a specific channel by its ID.
    """
    channel = session.exec(select(Channel).where(Channel.id == channel_id)).first()
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")
    return ChannelResponse(
        id=str(channel.id),
        name=channel.name,
        description=channel.description,
        owner_id=str(channel.owner_id)
    )

@router.put("/{channel_id}", response_model=ChannelResponse, summary="Update a channel")
async def update_channel(
    channel_id: str,
    channel_update: ChannelCreate, # Using ChannelCreate as a generic update model for simplicity
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Update an existing channel. Only the owner can update a channel.
    """
    channel = session.exec(select(Channel).where(Channel.id == channel_id)).first()
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")

    if channel.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this channel")

    # Update fields from channel_update
    channel.name = channel_update.name
    channel.description = channel_update.description

    session.add(channel)
    session.commit()
    session.refresh(channel)
    return ChannelResponse(
        id=str(channel.id),
        name=channel.name,
        description=channel.description,
        owner_id=str(channel.owner_id)
    )

@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a channel")
async def delete_channel(
    channel_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Delete a channel. Only the owner can delete a channel.
    """
    channel = session.exec(select(Channel).where(Channel.id == channel_id)).first()
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")

    if channel.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this channel")

    session.delete(channel)
    session.commit()
    return {"message": "Channel deleted successfully"}