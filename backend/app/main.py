# backend/app/main.py


from fastapi import FastAPI, HTTPException, Depends, status, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict
import os
from dotenv import load_dotenv
from uuid import uuid4 # Keep uuid4 for generating User IDs
from datetime import datetime, timedelta

# SQLModel imports needed for local use (e.g., in Task endpoints)
from sqlmodel import Session, select

from pydantic import BaseModel

# --- IMPORTANT: Ensure you have a 'schemas.py' file in the same directory (app/)
from .schemas import UserCreate, UserLogin, UserResponse, Token, Message, User, TokenData

# --- NEW IMPORT: Database utilities (engine, session dependency, table creation) ---
from .database import engine, get_session, create_db_and_tables
# ---------------------------------------------------------------------------------

# --- NEW IMPORTS: Authentication utilities and dependencies ---
from .dependencies.auth import (
    settings, # Settings object that contains SECRET_KEY, ALGORITHM, etc.
    verify_password,
    get_password_hash,
    create_access_token,
    oauth2_scheme,
    get_current_user,
    get_current_active_user # Useful for routes requiring an active user
)
# -------------------------------------------------------------

# --- NEW IMPORTS: FastAPI Routers for different functionalities ---
# Make sure these paths are correct relative to app/
from .routes import auth, users, channels, messages, websocket
# ----------------------------------------------------------------

# Load environment variables from .env file
load_dotenv()


# --- FastAPI App Initialization ---
app = FastAPI(
    title="WorkShop Backend API",
    description="API for WorkShop SaaS application",
    version="0.1.0",
)

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL], # Allow your frontend origin from settings
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- FastAPI Lifespan Events ---
@app.on_event("startup")
def on_startup():
    print("Application startup - Initializing database...")
    # Call create_db_and_tables from the new database.py
    create_db_and_tables()
    print("Database initialization complete.")

# --- API Endpoints (Routes) ---

@app.get("/", summary="Root endpoint")
async def read_root():
    return {"message": "Welcome to the WorkShop Backend API!"}

@app.get("/api/message", response_model=Message, summary="Get a simple message")
async def get_simple_message():
    return {"content": "Hello from the FastAPI Python backend!"}

# --- Include the new routers from the 'routes' directory ---
# Each router handles a specific set of related endpoints.
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(channels.router, prefix="/api/v1/channels", tags=["Channels"])
app.include_router(messages.router, prefix="/api/v1/messages", tags=["Messages"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
# ------------------------------------------------------------------

# --- Task Management Endpoints (In-memory storage for now) ---
# These endpoints are kept as they are part of your original application and not replaced by AI code.

# In-memory storage for tasks
# Key: user_id (str), Value: List of tasks for that user
fake_tasks_db: Dict[str, List[Dict]] = {}
next_task_id: int = 1 # Simple ID counter

# Pydantic Models for Tasks (Keep these as they are not SQLModels)
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    completed: bool = False
    priority: str = "medium"
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None

class TaskInDB(TaskBase):
    id: int
    owner_id: str # Changed to owner_id: str to match UUIDs
    created_at: datetime

    class Config:
        from_attributes = True

# Task CRUD Endpoints (Kept as they are, but adapted owner_email to owner_id)
@app.post("/api/v1/tasks/", response_model=TaskInDB, status_code=status.HTTP_201_CREATED, summary="Create a new task")
async def create_task(task: TaskCreate, current_user: User = Depends(get_current_user)):
    global next_task_id

    # Use current_user.id (UUID) as the key
    if current_user.id not in fake_tasks_db:
        fake_tasks_db[current_user.id] = []

    db_task = TaskInDB(
        id=next_task_id,
        owner_id=current_user.id, # Use user ID
        title=task.title,
        description=task.description,
        completed=task.completed,
        priority=task.priority,
        due_date=task.due_date,
        created_at=datetime.now()
    )
    fake_tasks_db[current_user.id].append(db_task.model_dump(mode='json')) # Use model_dump(mode='json') for better datetime serialization
    next_task_id += 1
    return db_task

@app.get("/api/v1/tasks/", response_model=List[TaskInDB], summary="Get all tasks for the current user")
async def get_user_tasks(current_user: User = Depends(get_current_user)):
    # Use current_user.id (UUID) as the key
    tasks = fake_tasks_db.get(current_user.id, [])
    # Convert string datetimes back to datetime objects for Pydantic validation
    return [
        TaskInDB(**{
            **task_data,
            'created_at': datetime.fromisoformat(task_data['created_at']) if isinstance(task_data.get('created_at'), str) else task_data.get('created_at'),
            'due_date': datetime.fromisoformat(task_data['due_date']) if isinstance(task_data.get('due_date'), str) else task_data.get('due_date')
        })
        for task_data in tasks
    ]

@app.get("/api/v1/tasks/{task_id}", response_model=TaskInDB, summary="Get a single task by ID")
async def get_task(task_id: int, current_user: User = Depends(get_current_user)):
    tasks = fake_tasks_db.get(current_user.id, [])
    for task_data in tasks:
        if task_data["id"] == task_id:
            return TaskInDB(**{
                **task_data,
                'created_at': datetime.fromisoformat(task_data['created_at']) if isinstance(task_data.get('created_at'), str) else task_data.get('created_at'),
                'due_date': datetime.fromisoformat(task_data['due_date']) if isinstance(task_data.get('due_date'), str) else task_data.get('due_date')
            })
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Task not found or you don't have access to it"
    )

@app.put("/api/v1/tasks/{task_id}", response_model=TaskInDB, summary="Update an existing task")
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user)
):
    tasks = fake_tasks_db.get(current_user.id, [])
    for idx, task_data in enumerate(tasks):
        if task_data["id"] == task_id:
            update_data = task_update.model_dump(exclude_unset=True, mode='json') # Use mode='json' here too
            updated_task_data = {**task_data, **update_data}

            # Ensure datetime fields are handled correctly upon retrieval
            if isinstance(updated_task_data.get('created_at'), str):
                updated_task_data['created_at'] = datetime.fromisoformat(updated_task_data['created_at'])
            if isinstance(updated_task_data.get('due_date'), str):
                updated_task_data['due_date'] = datetime.fromisoformat(updated_task_data['due_date'])

            fake_tasks_db[current_user.id][idx] = updated_task_data
            return TaskInDB(**updated_task_data)
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Task not found or you don't have access to it"
    )

@app.delete("/api/v1/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a task")
async def delete_task(task_id: int, current_user: User = Depends(get_current_user)):
    tasks = fake_tasks_db.get(current_user.id, [])
    initial_len = len(tasks)
    fake_tasks_db[current_user.id] = [
        task for task in tasks if task["id"] != task_id
    ]
    if len(fake_tasks_db[current_user.id]) == initial_len:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or you don't have access to it"
        )
    return {"message": "Task deleted successfully"}