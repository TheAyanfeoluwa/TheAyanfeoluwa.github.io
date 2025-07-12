# workshop-main/backend/app/routes/websocket.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException, status
from typing import Optional, Dict
import json
from datetime import datetime
import uuid # For generating UUIDs for messages

from sqlmodel import Session, select # For database operations
from sqlalchemy.exc import IntegrityError # To catch database errors

from ..websocket_manager import manager # Our updated manager
from ..dependencies.auth import get_current_user # To get the authenticated user
from ..database import get_session # To get a database session
# Import your SQLModel schemas for Message, Channel, User
from ..schemas import Message, Channel, User, MessageCreate, ChannelResponse, UserResponse # Ensure these are correct

router = APIRouter()

# WebSocket endpoint for community channels
@router.websocket("/ws/community/{channel_id}")
async def websocket_community_endpoint(
    websocket: WebSocket,
    channel_id: str,
    # This token is typically passed as a header, but for WebSocket, Query parameter is common
    token: Optional[str] = Query(None),
    session: Session = Depends(get_session) # Get a session for DB operations
):
    """WebSocket endpoint for real-time chat in channels."""

    current_user: Optional[User] = None
    if token:
        try:
            # Use get_current_user to validate the token and get the user
            current_user = await get_current_user(session=session, token=token)
        except HTTPException:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
            return

    if not current_user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
        return

    # Check if the channel exists
    channel = session.exec(select(Channel).where(Channel.id == channel_id)).first()
    if not channel:
        await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA, reason="Channel not found")
        return

    # Prepare user info for the manager
    user_info = {
        "id": str(current_user.id),
        "email": current_user.email,
        # Add any other user details you want to broadcast
        "username": current_user.email.split('@')[0], # Simple username from email for now
        "avatar": "https://example.com/default_avatar.png" # Placeholder avatar
    }

    # Connect the user to the channel via the manager
    await manager.connect_to_channel(websocket, channel_id, str(current_user.id), user_info)
    
    # Notify channel about user joining
    await manager.broadcast_to_channel({
        "type": "user_joined",
        "data": {
            "user_id": str(current_user.id),
            "username": user_info["username"],
            "channel_id": channel_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    }, channel_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "message":
                content = message_data["data"]["content"]
                
                # Create a new Message SQLModel instance
                new_message_id = str(uuid.uuid4()) # Generate UUID for message ID
                db_message = Message(
                    id=new_message_id, # Assign generated ID
                    content=content,
                    channel_id=channel_id,
                    sender_id=current_user.id,
                    timestamp=datetime.utcnow()
                )
                
                try:
                    session.add(db_message)
                    session.commit()
                    session.refresh(db_message)
                except IntegrityError:
                    session.rollback()
                    print(f"Error saving message to DB: IntegrityError for {new_message_id}")
                    await websocket.send_json({"type": "error", "data": "Failed to save message"})
                    continue
                except Exception as e:
                    session.rollback()
                    print(f"Error saving message to DB: {e}")
                    await websocket.send_json({"type": "error", "data": "Failed to save message"})
                    continue
                
                # Prepare message for broadcasting
                broadcast_message = {
                    "type": "message",
                    "data": {
                        "id": str(db_message.id),
                        "channel_id": str(db_message.channel_id),
                        "user_id": str(db_message.sender_id),
                        "username": user_info["username"], # Using user_info from connection
                        "content": db_message.content,
                        "timestamp": db_message.timestamp.isoformat(),
                        "avatar": user_info["avatar"] # Using user_info from connection
                    }
                }
                
                # Broadcast to all connections in the channel
                await manager.broadcast_to_channel(broadcast_message, channel_id)
            
            elif message_data.get("type") == "typing":
                # Handle typing indicators
                typing_message = {
                    "type": "typing",
                    "data": {
                        "user_id": str(current_user.id),
                        "username": user_info["username"],
                        "channel_id": channel_id,
                        "is_typing": message_data["data"].get("is_typing", False)
                    }
                }
                await manager.broadcast_to_channel(typing_message, channel_id)
                
    except WebSocketDisconnect:
        manager.disconnect_from_channel(websocket, channel_id, str(current_user.id))
        
        # Notify channel about user leaving
        await manager.broadcast_to_channel({
            "type": "user_left",
            "data": {
                "user_id": str(current_user.id),
                "username": user_info["username"],
                "channel_id": channel_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }, channel_id)
    except Exception as e:
        print(f"WebSocket error for client {current_user.id} in channel {channel_id}: {e}")
        # Ensure disconnection even on unexpected errors
        manager.disconnect_from_channel(websocket, channel_id, str(current_user.id))
        await manager.broadcast_to_channel({
            "type": "error",
            "data": f"Client #{current_user.id} disconnected due to an error."
        }, channel_id)


# WebSocket endpoint for direct messages
@router.websocket("/ws/direct/{target_user_id}")
async def direct_message_websocket(
    websocket: WebSocket,
    target_user_id: str, # Target user for direct message
    token: Optional[str] = Query(None),
    session: Session = Depends(get_session)
):
    """WebSocket endpoint for direct messages"""
    
    current_user: Optional[User] = None
    if token:
        try:
            current_user = await get_current_user(session=session, token=token)
        except HTTPException:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
            return

    if not current_user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
        return

    # Prepare user info for the manager
    user_info = {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.email.split('@')[0], # Simple username from email for now
        "avatar": "https://example.com/default_avatar.png" # Placeholder avatar
    }

    # Register the current user's direct message connection
    await manager.connect_to_channel(websocket, f"dm_{current_user.id}_{target_user_id}", str(current_user.id), user_info) # Use a dummy channel_id for DMs
    manager.user_connections[str(current_user.id)] = websocket # Add to general user connections

    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "direct_message":
                content = message_data["data"]["content"]
                
                # Create a new Message SQLModel instance (for DMs, typically a separate model or a flag)
                # For simplicity, we'll use the same Message model, but you might want a DirectMessage model
                new_message_id = str(uuid.uuid4())
                db_message = Message(
                    id=new_message_id,
                    content=content,
                    sender_id=current_user.id,
                    receiver_id=uuid.UUID(target_user_id), # Assuming receiver_id field exists and is UUID
                    channel_id=None, # Direct messages don't belong to a public channel
                    timestamp=datetime.utcnow()
                )
                
                try:
                    session.add(db_message)
                    session.commit()
                    session.refresh(db_message)
                except IntegrityError:
                    session.rollback()
                    print(f"Error saving DM to DB: IntegrityError for {new_message_id}")
                    await websocket.send_json({"type": "error", "data": "Failed to save direct message"})
                    continue
                except Exception as e:
                    session.rollback()
                    print(f"Error saving DM to DB: {e}")
                    await websocket.send_json({"type": "error", "data": "Failed to save direct message"})
                    continue
                
                dm_message = {
                    "type": "direct_message",
                    "data": {
                        "id": str(db_message.id),
                        "sender_id": str(db_message.sender_id),
                        "recipient_id": str(db_message.receiver_id),
                        "username": user_info["username"],
                        "content": db_message.content,
                        "timestamp": db_message.timestamp.isoformat(),
                        "avatar": user_info["avatar"]
                    }
                }
                
                # Send to both sender and recipient (if connected)
                await manager.broadcast_to_users(dm_message, [str(current_user.id), target_user_id])
                
    except WebSocketDisconnect:
        # Disconnect from the dummy DM channel
        manager.disconnect_from_channel(websocket, f"dm_{current_user.id}_{target_user_id}", str(current_user.id))
        if str(current_user.id) in manager.user_connections and manager.user_connections[str(current_user.id)] == websocket:
            del manager.user_connections[str(current_user.id)]
        if str(current_user.id) in manager.connected_user_info:
            del manager.connected_user_info[str(current_user.id)]
        print(f"Client {current_user.id} disconnected from direct message.")

    except Exception as e:
        print(f"WebSocket error for client {current_user.id} in direct message: {e}")
        # Ensure disconnection even on unexpected errors
        manager.disconnect_from_channel(websocket, f"dm_{current_user.id}_{target_user_id}", str(current_user.id))
        if str(current_user.id) in manager.user_connections and manager.user_connections[str(current_user.id)] == websocket:
            del manager.user_connections[str(current_user.id)]
        if str(current_user.id) in manager.connected_user_info:
            del manager.connected_user_info[str(current_user.id)]