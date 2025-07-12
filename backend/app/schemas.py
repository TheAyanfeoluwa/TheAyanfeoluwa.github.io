# backend/app/schemas.py
from typing import Optional
from sqlmodel import Field, SQLModel # Import SQLModel and Field
from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID, uuid4 # Import UUID and uuid4 for generating IDs

# --- User database model ---
class User(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid4()), primary_key=True, nullable=False) # Use str for UUIDs
    email: EmailStr = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    
    username: str = Field(index=True, max_length=50)
    avatar_url: Optional[str] = Field(default=None, max_length=255)

# --- Schema for user creation ---
class UserCreate(SQLModel):
    email: EmailStr
    password: str
    username: str
    avatar_url: Optional[str] = None

# Schema for user login
class UserLogin(SQLModel):
    email: EmailStr
    password: str

# --- Schema for user response ---
class UserResponse(SQLModel):
    id: str
    email: EmailStr
    is_active: bool
    username: str
    avatar_url: Optional[str] = None
    status: Optional[str] = "offline"

# --- Schema for JWT token response ---
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Schema for generic API responses (e.g., success/error messages)
class GenericMessage(SQLModel): # Renamed from 'Message' to avoid conflict
    content: str

# --- Models for Community Features (Channels, Messages) ---

# Channel models
class Channel(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True, nullable=False)
    name: str = Field(index=True, max_length=100)
    description: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    owner_id: str = Field(foreign_key="user.id", nullable=False) # Added owner_id

class ChannelCreate(SQLModel):
    name: str
    description: Optional[str] = None

class ChannelResponse(SQLModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    owner_id: str

# Unified Message model (for both channel and direct messages)
class Message(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True, nullable=False) # UUID for message ID
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    
    sender_id: str = Field(foreign_key="user.id", nullable=False) # The user who sent the message
    channel_id: Optional[str] = Field(default=None, foreign_key="channel.id") # For channel messages
    receiver_id: Optional[str] = Field(default=None, foreign_key="user.id") # For direct messages (recipient)

    # Validation: A message must be either a channel message or a direct message
    # This logic is usually handled in the API route, but we can add checks here too if needed
    # For SQLModel, we define the fields; validation logic happens in Pydantic/FastAPI
    # __tablename__ = "messages" # Optional: explicitly define table name

class MessageCreate(SQLModel):
    content: str
    channel_id: Optional[str] = None # Optional for direct messages
    recipient_id: Optional[str] = None # Optional for channel messages (used for DMs)

class MessageResponse(SQLModel):
    id: str
    content: str
    timestamp: datetime
    sender_id: str
    channel_id: Optional[str] = None
    receiver_id: Optional[str] = None # Added for DMs
    username: Optional[str] = None # Will be populated from the sender's user info
    avatar_url: Optional[str] = None # Will be populated from the sender's user info


# WebSocket message models (Pydantic models for data sent over WebSockets)
class WebSocketMessage(BaseModel):
    type: str # e.g., "message", "typing", "user_joined", "direct_message"
    data: dict # The actual payload

class ChatMessage(BaseModel): # This is a Pydantic model for the content of a 'message' type WebSocket message
    id: str # Message ID from DB (now string/UUID)
    channel_id: Optional[str] = None # Optional for DMs
    user_id: str # Sender's UUID
    username: str
    content: str
    avatar_url: Optional[str] = None
    timestamp: datetime
    recipient_id: Optional[str] = None # For DMs

class TypingStatus(BaseModel): # For typing indicators
    user_id: str
    username: str
    channel_id: Optional[str] = None # Can be None for DMs
    is_typing: bool

class UserStatusChange(BaseModel): # For user joined/left/status change
    user_id: str
    username: str
    status: str # e.g., "online", "offline", "typing"
    channel_id: Optional[str] = None # Which channel the status change occurred in (if applicable)

# Authentication models
class TokenData(BaseModel):
    user_id: Optional[str] = None # Changed to str to match your UUIDs