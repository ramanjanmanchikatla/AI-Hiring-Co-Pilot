from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, Integer, String, Float, Text, Boolean
import os
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Database URL - SQLite
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///./ai_hiring.db"

# Create async engine
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL, 
    echo=True, 
    future=True,
    connect_args={"check_same_thread": False}
)

# Session maker
async_session = sessionmaker(
    engine, 
    expire_on_commit=False,
    class_=AsyncSession
)

# Base class for models
Base = declarative_base()

# User model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    disabled = Column(Boolean, default=False)

# ResumeReport model
class ResumeReport(Base):
    __tablename__ = "resume_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    filename = Column(String)
    score = Column(Float)
    report = Column(Text)

async def init_db():
    """Initialize database and create tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created successfully!")

async def get_db() -> AsyncSession:
    """Dependency to get DB session"""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()