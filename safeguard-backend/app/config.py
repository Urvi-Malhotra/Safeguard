import os
from typing import Any, Dict, Optional
from pydantic import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SafeGuard API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "safeguard-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = "sqlite:///./database.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Emergency Settings
    NEARBY_RADIUS_KM: float = 3.0
    EMERGENCY_RECORDING_DURATION: int = 900  # 15 minutes
    ALARM_DURATION: int = 180  # 3 minutes
    
    class Config:
        case_sensitive = True

settings = Settings()
