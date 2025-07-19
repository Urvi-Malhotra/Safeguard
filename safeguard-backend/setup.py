from sqlalchemy import create_engine
from app.database import Base
from app.config import settings
import os

def init_database():
    """Initialize database with tables"""
    
    # Create database file if it doesn't exist
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        open(db_path, 'a').close()
    
    # Create engine and tables
    engine = create_engine(settings.DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    
    print("Database initialized successfully!")

if __name__ == "__main__":
    init_database()
