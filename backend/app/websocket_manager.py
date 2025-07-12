# workshop-main/backend/app/websocket_manager.py

from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
import json # Import json for sending dicts

class ConnectionManager:
    """
    Manages active WebSocket connections for both general and channel-specific chats.
    """
    def __init__(self):
        # General connections (not channel-specific, e.g., for direct messages or user status)
        self.user_connections: Dict[str, WebSocket] = {} # Maps user_id (str) to WebSocket
        
        # Channel-specific connections
        # Maps channel_id (str) to a dict of user_id (str) to WebSocket
        self.channel_connections: Dict[str, Dict[str, WebSocket]] = {}
        
        # Store user info for quick lookup when broadcasting
        # Maps user_id (str) to user_info (dict)
        self.connected_user_info: Dict[str, Dict] = {} 

    async def connect_to_channel(self, websocket: WebSocket, channel_id: str, user_id: str, user_info: Dict):
        """
        Establishes a new WebSocket connection for a specific channel.
        """
        await websocket.accept()
        
        if channel_id not in self.channel_connections:
            self.channel_connections[channel_id] = {}
        self.channel_connections[channel_id][user_id] = websocket
        
        self.user_connections[user_id] = websocket # Also track in general user connections
        self.connected_user_info[user_id] = user_info

    def disconnect_from_channel(self, websocket: WebSocket, channel_id: str, user_id: str):
        """
        Removes a disconnected WebSocket from a specific channel.
        """
        if channel_id in self.channel_connections and user_id in self.channel_connections[channel_id]:
            del self.channel_connections[channel_id][user_id]
            if not self.channel_connections[channel_id]: # If channel becomes empty
                del self.channel_connections[channel_id]
        
        if user_id in self.user_connections and self.user_connections[user_id] == websocket:
             del self.user_connections[user_id]
        if user_id in self.connected_user_info:
            del self.connected_user_info[user_id]

    async def send_personal_message(self, message: Dict, websocket: WebSocket):
        """
        Sends a message (dict) to a specific WebSocket client.
        """
        await websocket.send_json(message)

    async def broadcast_to_channel(self, message: Dict, channel_id: str):
        """
        Broadcasts a message (dict) to all active WebSocket clients in a specific channel.
        """
        if channel_id in self.channel_connections:
            for user_id, connection in list(self.channel_connections[channel_id].items()): # Use list for safe iteration
                try:
                    await connection.send_json(message)
                except RuntimeError: # Handle WebSocket already closed during broadcast
                    print(f"Failed to send to user {user_id} in channel {channel_id}, connection likely closed.")
                    # Optionally remove the disconnected client here, but `disconnect_from_channel` should handle it
                    # if user disconnects normally.

    async def broadcast_to_users(self, message: Dict, user_ids: List[str]):
        """
        Sends a message (dict) to a list of specific user IDs.
        """
        for user_id in user_ids:
            if user_id in self.user_connections:
                try:
                    await self.user_connections[user_id].send_json(message)
                except RuntimeError:
                    print(f"Failed to send direct message to user {user_id}, connection likely closed.")
                    # Optionally remove the disconnected client here
            else:
                print(f"User {user_id} not found in active connections for direct message.")

# Instantiate the manager to be imported by other modules
manager = ConnectionManager()