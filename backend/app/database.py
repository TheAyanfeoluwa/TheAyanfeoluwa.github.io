# workshop-main/backend/app/database.py

import os
from sqlmodel import Session, SQLModel, create_engine
from dotenv import load_dotenv
from pydantic import BaseModel # For Settings

# Load environment variables
load_dotenv()

# --- Configuration Settings (Copied from main.py, as it's needed for DATABASE_URL) ---
# It's ideal to have a single settings object, but for simplicity of fixing,
# we'll redefine relevant parts here, or you can import if Settings is truly global.
# For now, let's copy the settings relevant to database.
class Settings(BaseModel):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./database.db") # SQLite database file

settings = Settings()

# --- Database Engine Setup ---
# The engine is created once.
engine = create_engine(settings.DATABASE_URL, echo=True) # echo=True for logging SQL queries (good for debugging)

# --- Function to Create Database Tables ---
def create_db_and_tables():
    """
    This function creates all tables defined as SQLModel(table=True)
    via the SQLAlchemy metadata.
    """
    print("Creating database tables...")
    SQLModel.metadata.create_all(engine)
    print("Database tables created/checked.")

# --- Dependency to Get a Database Session ---
# This function yields a database session that can be injected into route functions.
def get_session():
    with Session(engine) as session:
        yield session