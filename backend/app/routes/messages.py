# workshop-main/backend/app/routes/messages.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

# Import authentication dependencies from your new centralized location
from ..dependencies.auth import get_current_user # Assuming verify_token maps to get_current_user
# Import your schemas (ensure Message, MessageCreate, User, Channel are imported)
from ..schemas import Message, MessageCreate, MessageResponse, User, Channel # Add MessageResponse if you have one
from ..database import get_session # Import get_session from your database.py

router = APIRouter()

# --- Message Endpoints ---

@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED, summary="Create a new message")
async def create_message(
    message_create: MessageCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create a new message in a channel.
    """
    # First, verify the channel exists
    channel = session.exec(select(Channel).where(Channel.id == message_create.channel_id)).first()
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")

    db_message = Message(
        content=message_create.content,
        channel_id=message_create.channel_id,
        sender_id=current_user.id, # The authenticated user is the sender
        timestamp=datetime.utcnow() # Set current UTC time
    )
    session.add(db_message)
    session.commit()
    session.refresh(db_message)

    # Return a response model (assuming you have MessageResponse in schemas.py)
    return MessageResponse(
        id=str(db_message.id),
        content=db_message.content,
        channel_id=str(db_message.channel_id),
        sender_id=str(db_message.sender_id),
        timestamp=db_message.timestamp
    )

@router.get("/channel/{channel_id}", response_model=List[MessageResponse], summary="Get messages for a channel")
async def get_messages_for_channel(
    channel_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user) # Optionally require authentication to view messages
):
    """
    Retrieve all messages for a given channel.
    """
    # Optional: Verify user has access to this channel if it's private
    channel = session.exec(select(Channel).where(Channel.id == channel_id)).first()
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")
    # Add logic here if channels have private access controls, e.g., if current_user not in channel_members:

    messages = session.exec(select(Message).where(Message.channel_id == channel_id).order_by(Message.timestamp)).all()
    return [
        MessageResponse(
            id=str(message.id),
            content=message.content,
            channel_id=str(message.channel_id),
            sender_id=str(message.sender_id),
            timestamp=message.timestamp
        )
        for message in messages
    ]

@router.get("/{message_id}", response_model=MessageResponse, summary="Get message by ID")
async def get_message_by_id(
    message_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user) # Optionally require authentication
):
    """
    Retrieve a specific message by its ID.
    """
    message = session.exec(select(Message).where(Message.id == message_id)).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    # Optional: Check if current_user has access to the channel this message belongs to
    return MessageResponse(
        id=str(message.id),
        content=message.content,
        channel_id=str(message.channel_id),
        sender_id=str(message.sender_id),
        timestamp=message.timestamp
    )


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a message")
async def delete_message(
    message_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Delete a message. Only the sender or an admin can delete a message.
    """
    message = session.exec(select(Message).where(Message.id == message_id)).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    # Assuming User model has an 'is_admin' field or similar logic
    # if message.sender_id != current_user.id and not current_user.is_admin:
    if message.sender_id != current_user.id: # For now, only sender can delete
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this message")

    session.delete(message)
    session.commit()
    return {"message": "Message deleted successfully"}