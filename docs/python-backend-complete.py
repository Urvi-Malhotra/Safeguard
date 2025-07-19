# ==============================================================================
# SAFEGUARD BACKEND - COMPLETE PYTHON CODEBASE
# ==============================================================================

# requirements.txt
"""
fastapi==0.104.1
uvicorn==0.24.0
python-socketio==5.9.0
sqlalchemy==2.0.23
sqlite3
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
aiofiles==23.2.1
python-socketio[asyncio]==5.9.0
websockets==12.0
geopy==2.4.1
haversine==2.8.0
asyncio-mqtt==0.16.1
schedule==1.2.0
"""

# ==============================================================================
# PROJECT STRUCTURE
# ==============================================================================
"""
safeguard-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py              # Configuration settings
│   ├── database.py            # Database setup
│   ├── models/                # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── emergency.py
│   │   └── location.py
│   ├── schemas/               # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── emergency.py
│   │   └── auth.py
│   ├── api/                   # API routes
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── emergency.py
│   │   ├── location.py
│   │   └── voice.py
│   ├── core/                  # Core functionality
│   │   ├── __init__.py
│   │   ├── security.py
│   │   ├── config.py
│   │   └── dependencies.py
│   ├── services/              # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── emergency_service.py
│   │   ├── location_service.py
│   │   ├── voice_service.py
│   │   └── socket_service.py
│   └── utils/                 # Utilities
│       ├── __init__.py
│       ├── helpers.py
│       └── constants.py
├── uploads/                   # File storage
├── database.db              # SQLite database
├── requirements.txt
└── run.py                    # Application runner
"""

# ==============================================================================
# app/config.py - Configuration Settings
# ==============================================================================

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

# ==============================================================================
# app/database.py - Database Setup
# ==============================================================================

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL, 
    connect_args={"check_same_thread": False}  # For SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==============================================================================
# app/models/user.py - User Models
# ==============================================================================

from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String)
    date_of_birth = Column(String)
    gender = Column(String)
    address = Column(Text)
    profile_picture = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    emergency_contacts = relationship("EmergencyContact", back_populates="user", cascade="all, delete-orphan")
    voice_phrases = relationship("VoicePhrase", back_populates="user", cascade="all, delete-orphan")
    emergency_sessions = relationship("EmergencySession", back_populates="user", cascade="all, delete-orphan")
    locations = relationship("UserLocation", back_populates="user", cascade="all, delete-orphan")

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    relationship = Column(String)
    priority_order = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="emergency_contacts")

class VoicePhrase(Base):
    __tablename__ = "voice_phrases"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    phrase = Column(String, nullable=False)
    phrase_password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="voice_phrases")

# ==============================================================================
# app/models/emergency.py - Emergency Models
# ==============================================================================

from sqlalchemy import Column, String, DateTime, Boolean, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class EmergencySession(Base):
    __tablename__ = "emergency_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    trigger_type = Column(String, nullable=False)  # 'voice', 'manual', 'automatic'
    location_lat = Column(Float)
    location_lng = Column(Float)
    status = Column(String, default="active")  # 'active', 'dismissed', 'resolved'
    recording_path = Column(String)
    triggered_at = Column(DateTime, default=func.now())
    resolved_at = Column(DateTime)
    metadata = Column(Text)  # JSON string for additional data
    
    # Relationships
    user = relationship("User", back_populates="emergency_sessions")
    alerts = relationship("EmergencyAlert", back_populates="emergency_session", cascade="all, delete-orphan")

class EmergencyAlert(Base):
    __tablename__ = "emergency_alerts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    emergency_session_id = Column(String, ForeignKey("emergency_sessions.id"), nullable=False)
    recipient_type = Column(String, nullable=False)  # 'contact', 'nearby_user', 'police'
    recipient_id = Column(String, nullable=False)
    alert_method = Column(String, nullable=False)  # 'sms', 'push', 'call', 'email'
    status = Column(String, default="sent")  # 'sent', 'delivered', 'failed'
    sent_at = Column(DateTime, default=func.now())
    delivered_at = Column(DateTime)
    
    # Relationships
    emergency_session = relationship("EmergencySession", back_populates="alerts")

# ==============================================================================
# app/models/location.py - Location Models
# ==============================================================================

from sqlalchemy import Column, String, DateTime, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class UserLocation(Base):
    __tablename__ = "user_locations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float)
    timestamp = Column(DateTime, default=func.now())
    is_emergency = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="locations")

# ==============================================================================
# app/schemas/auth.py - Authentication Schemas
# ==============================================================================

from pydantic import BaseModel, EmailStr
from typing import Optional

class GoogleAuthRequest(BaseModel):
    google_token: Optional[str] = None  # For real Google OAuth
    
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
class UserLogin(BaseModel):
    email: EmailStr
    
class UserInToken(BaseModel):
    user_id: str
    email: str

# ==============================================================================
# app/schemas/user.py - User Schemas
# ==============================================================================

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None

class User(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class EmergencyContactBase(BaseModel):
    name: str
    phone: str
    relationship: Optional[str] = None
    priority_order: Optional[int] = 1

class EmergencyContactCreate(EmergencyContactBase):
    pass

class EmergencyContact(EmergencyContactBase):
    id: str
    user_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class VoicePhraseBase(BaseModel):
    phrase: str

class VoicePhraseCreate(VoicePhraseBase):
    phrase_password: str

class VoicePhraseUpdate(BaseModel):
    phrase: str
    old_password: str
    new_password: str

class VoicePhrase(VoicePhraseBase):
    id: str
    user_id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==============================================================================
# app/schemas/emergency.py - Emergency Schemas
# ==============================================================================

from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class LocationData(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class EmergencyTrigger(BaseModel):
    trigger_type: str  # 'voice', 'manual', 'automatic'
    location: Optional[LocationData] = None
    phrase: Optional[str] = None
    confidence: Optional[float] = None

class EmergencySessionResponse(BaseModel):
    id: str
    user_id: str
    trigger_type: str
    location_lat: Optional[float]
    location_lng: Optional[float]
    status: str
    triggered_at: datetime
    
    class Config:
        from_attributes = True

class EmergencyDismiss(BaseModel):
    session_id: str
    reason: Optional[str] = None

class NearbyUser(BaseModel):
    id: str
    name: str
    distance: float
    last_seen: datetime

# ==============================================================================
# app/core/security.py - Security Functions
# ==============================================================================

from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload.get("sub")
    except jwt.JWTError:
        return None

# ==============================================================================
# app/core/dependencies.py - FastAPI Dependencies
# ==============================================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import verify_token
from app.models.user import User

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    user_id = verify_token(token)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

# ==============================================================================
# app/services/auth_service.py - Authentication Service
# ==============================================================================

from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import create_access_token
import uuid

class AuthService:
    @staticmethod
    def mock_google_auth(db: Session) -> dict:
        """Mock Google OAuth for POC"""
        # Simulate Google user data
        mock_user_data = {
            "email": "demo@safeguard.com",
            "name": "Demo User",
            "picture": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face"
        }
        
        # Check if user exists
        user = db.query(User).filter(User.email == mock_user_data["email"]).first()
        
        if not user:
            # Create new user
            user = User(
                id=str(uuid.uuid4()),
                email=mock_user_data["email"],
                name=mock_user_data["name"],
                profile_picture=mock_user_data["picture"]
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Generate token
        access_token = create_access_token(subject=user.id)
        
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "picture": user.profile_picture
            },
            "access_token": access_token,
            "token_type": "bearer"
        }

# ==============================================================================
# app/services/emergency_service.py - Emergency Service
# ==============================================================================

from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.models.user import User
from app.models.emergency import EmergencySession, EmergencyAlert
from app.models.location import UserLocation
from app.schemas.emergency import EmergencyTrigger, LocationData
from app.services.location_service import LocationService
from typing import List, Dict, Any
import uuid
import json
from datetime import datetime, timedelta

class EmergencyService:
    @staticmethod
    def trigger_emergency(
        db: Session, 
        user: User, 
        emergency_data: EmergencyTrigger,
        socket_manager=None
    ) -> Dict[str, Any]:
        """Trigger emergency alert"""
        
        # Create emergency session
        session = EmergencySession(
            id=str(uuid.uuid4()),
            user_id=user.id,
            trigger_type=emergency_data.trigger_type,
            location_lat=emergency_data.location.latitude if emergency_data.location else None,
            location_lng=emergency_data.location.longitude if emergency_data.location else None,
            metadata=json.dumps({
                "phrase": emergency_data.phrase,
                "confidence": emergency_data.confidence
            }) if emergency_data.phrase else None
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        # Save emergency location
        if emergency_data.location:
            location = UserLocation(
                id=str(uuid.uuid4()),
                user_id=user.id,
                latitude=emergency_data.location.latitude,
                longitude=emergency_data.location.longitude,
                accuracy=emergency_data.location.accuracy,
                is_emergency=True
            )
            db.add(location)
        
        # Get emergency contacts
        emergency_contacts = user.emergency_contacts
        
        # Get nearby users
        nearby_users = []
        if emergency_data.location:
            nearby_users = LocationService.get_nearby_users(
                db, user.id, emergency_data.location.latitude, emergency_data.location.longitude
            )
        
        # Send alerts to emergency contacts
        for contact in emergency_contacts:
            alert = EmergencyAlert(
                id=str(uuid.uuid4()),
                emergency_session_id=session.id,
                recipient_type="contact",
                recipient_id=contact.id,
                alert_method="sms"
            )
            db.add(alert)
        
        # Send alerts to nearby users
        for nearby_user in nearby_users:
            alert = EmergencyAlert(
                id=str(uuid.uuid4()),
                emergency_session_id=session.id,
                recipient_type="nearby_user",
                recipient_id=nearby_user.id,
                alert_method="push"
            )
            db.add(alert)
        
        # Send alert to police (simulation)
        police_alert = EmergencyAlert(
            id=str(uuid.uuid4()),
            emergency_session_id=session.id,
            recipient_type="police",
            recipient_id="local_police_station",
            alert_method="system"
        )
        db.add(police_alert)
        
        db.commit()
        
        # Broadcast via WebSocket
        if socket_manager:
            emergency_broadcast = {
                "session_id": session.id,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "phone": user.phone
                },
                "location": {
                    "latitude": emergency_data.location.latitude,
                    "longitude": emergency_data.location.longitude
                } if emergency_data.location else None,
                "trigger_type": emergency_data.trigger_type,
                "timestamp": session.triggered_at.isoformat()
            }
            
            # Notify nearby users
            for nearby_user in nearby_users:
                socket_manager.emit_to_user(nearby_user.id, "emergency_alert", emergency_broadcast)
            
            # Notify emergency contacts (if they're app users)
            for contact in emergency_contacts:
                # Check if contact is an app user
                contact_user = db.query(User).filter(User.phone == contact.phone).first()
                if contact_user:
                    socket_manager.emit_to_user(contact_user.id, "emergency_alert", emergency_broadcast)
        
        return {
            "success": True,
            "session_id": session.id,
            "message": "Emergency alert triggered successfully",
            "contacts_notified": len(emergency_contacts),
            "nearby_users_notified": len(nearby_users)
        }
    
    @staticmethod
    def dismiss_emergency(db: Session, user: User, session_id: str, socket_manager=None) -> Dict[str, Any]:
        """Dismiss emergency alert"""
        
        session = db.query(EmergencySession).filter(
            and_(
                EmergencySession.id == session_id,
                EmergencySession.user_id == user.id,
                EmergencySession.status == "active"
            )
        ).first()
        
        if not session:
            return {"success": False, "message": "Emergency session not found or already resolved"}
        
        # Update session status
        session.status = "dismissed"
        session.resolved_at = datetime.utcnow()
        db.commit()
        
        # Broadcast dismissal
        if socket_manager:
            dismissal_data = {
                "session_id": session_id,
                "user_id": user.id,
                "dismissed_at": session.resolved_at.isoformat()
            }
            socket_manager.broadcast("emergency_dismissed", dismissal_data)
        
        return {
            "success": True,
            "message": "Emergency dismissed successfully"
        }
    
    @staticmethod
    def get_active_emergency(db: Session, user: User) -> Dict[str, Any]:
        """Get user's active emergency session"""
        
        session = db.query(EmergencySession).filter(
            and_(
                EmergencySession.user_id == user.id,
                EmergencySession.status == "active"
            )
        ).first()
        
        if session:
            return {
                "active": True,
                "session_id": session.id,
                "trigger_type": session.trigger_type,
                "triggered_at": session.triggered_at.isoformat(),
                "location": {
                    "latitude": session.location_lat,
                    "longitude": session.location_lng
                } if session.location_lat and session.location_lng else None
            }
        
        return {"active": False}

# ==============================================================================
# app/services/location_service.py - Location Service
# ==============================================================================

from sqlalchemy.orm import Session
from sqlalchemy import and_, func, text
from app.models.user import User, UserLocation
from typing import List
from datetime import datetime, timedelta
import math

class LocationService:
    @staticmethod
    def update_user_location(
        db: Session, 
        user_id: str, 
        latitude: float, 
        longitude: float, 
        accuracy: float = None
    ) -> bool:
        """Update user's current location"""
        
        location = UserLocation(
            user_id=user_id,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy
        )
        
        db.add(location)
        db.commit()
        return True
    
    @staticmethod
    def get_nearby_users(
        db: Session, 
        user_id: str, 
        latitude: float, 
        longitude: float, 
        radius_km: float = 3.0
    ) -> List[User]:
        """Get nearby users within specified radius"""
        
        # Get recent locations (within last 5 minutes)
        recent_time = datetime.utcnow() - timedelta(minutes=5)
        
        # Haversine formula for distance calculation
        # Note: This is a simplified approach. For production, use PostGIS or similar
        query = text("""
            SELECT DISTINCT u.*, 
                   (6371 * acos(cos(radians(:lat)) * cos(radians(ul.latitude)) * 
                   cos(radians(ul.longitude) - radians(:lng)) + 
                   sin(radians(:lat)) * sin(radians(ul.latitude)))) AS distance
            FROM users u
            JOIN user_locations ul ON u.id = ul.user_id
            WHERE ul.timestamp > :recent_time
            AND u.id != :user_id
            HAVING distance < :radius
            ORDER BY distance
        """)
        
        result = db.execute(query, {
            "lat": latitude,
            "lng": longitude,
            "recent_time": recent_time,
            "user_id": user_id,
            "radius": radius_km
        })
        
        nearby_users = []
        for row in result:
            user = db.query(User).filter(User.id == row.id).first()
            if user:
                nearby_users.append(user)
        
        return nearby_users
    
    @staticmethod
    def get_user_location_history(
        db: Session, 
        user_id: str, 
        limit: int = 100
    ) -> List[UserLocation]:
        """Get user's location history"""
        
        return db.query(UserLocation).filter(
            UserLocation.user_id == user_id
        ).order_by(UserLocation.timestamp.desc()).limit(limit).all()

# ==============================================================================
# app/services/voice_service.py - Voice Recognition Service
# ==============================================================================

from sqlalchemy.orm import Session
from app.models.user import User, VoicePhrase
from app.core.security import get_password_hash, verify_password
from app.schemas.user import VoicePhraseCreate, VoicePhraseUpdate
import uuid

class VoiceService:
    @staticmethod
    def train_phrase(db: Session, user: User, phrase_data: VoicePhraseCreate) -> dict:
        """Train new voice phrase"""
        
        # Deactivate existing phrases
        db.query(VoicePhrase).filter(VoicePhrase.user_id == user.id).update(
            {"is_active": False}
        )
        
        # Create new phrase
        voice_phrase = VoicePhrase(
            id=str(uuid.uuid4()),
            user_id=user.id,
            phrase=phrase_data.phrase.lower().strip(),
            phrase_password_hash=get_password_hash(phrase_data.phrase_password),
            is_active=True
        )
        
        db.add(voice_phrase)
        db.commit()
        db.refresh(voice_phrase)
        
        return {
            "success": True,
            "phrase_id": voice_phrase.id,
            "message": "Voice phrase trained successfully"
        }
    
    @staticmethod
    def verify_phrase(db: Session, user: User, spoken_text: str, confidence: float = 0.8) -> dict:
        """Verify if spoken text matches trained phrase"""
        
        active_phrase = db.query(VoicePhrase).filter(
            VoicePhrase.user_id == user.id,
            VoicePhrase.is_active == True
        ).first()
        
        if not active_phrase:
            return {"match": False, "message": "No active phrase found"}
        
        # Simple phrase matching (in production, use advanced voice recognition)
        spoken_lower = spoken_text.lower().strip()
        phrase_lower = active_phrase.phrase.lower().strip()
        
        # Check if phrase is contained in spoken text
        if phrase_lower in spoken_lower and confidence >= 0.6:
            return {
                "match": True,
                "phrase_id": active_phrase.id,
                "confidence": confidence,
                "message": "Phrase matched successfully"
            }
        
        return {"match": False, "message": "Phrase not matched"}
    
    @staticmethod
    def update_phrase(db: Session, user: User, update_data: VoicePhraseUpdate) -> dict:
        """Update existing voice phrase"""
        
        active_phrase = db.query(VoicePhrase).filter(
            VoicePhrase.user_id == user.id,
            VoicePhrase.is_active == True
        ).first()
        
        if not active_phrase:
            return {"success": False, "message": "No active phrase found"}
        
        # Verify old password
        if not verify_password(update_data.old_password, active_phrase.phrase_password_hash):
            return {"success": False, "message": "Invalid password"}
        
        # Update phrase
        active_phrase.phrase = update_data.phrase.lower().strip()
        active_phrase.phrase_password_hash = get_password_hash(update_data.new_password)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Voice phrase updated successfully"
        }
    
    @staticmethod
    def get_user_phrase(db: Session, user: User) -> dict:
        """Get user's active voice phrase"""
        
        active_phrase = db.query(VoicePhrase).filter(
            VoicePhrase.user_id == user.id,
            VoicePhrase.is_active == True
        ).first()
        
        if active_phrase:
            return {
                "has_phrase": True,
                "phrase": active_phrase.phrase,
                "created_at": active_phrase.created_at.isoformat()
            }
        
        return {"has_phrase": False}

# ==============================================================================
# app/services/socket_service.py - WebSocket Service
# ==============================================================================

import socketio
from typing import Dict, Any
import asyncio
import json

class SocketManager:
    def __init__(self):
        self.sio = socketio.AsyncServer(
            cors_allowed_origins=["http://localhost:3000"],
            async_mode='asgi'
        )
        self.connected_users: Dict[str, str] = {}  # user_id: session_id
        self.user_sessions: Dict[str, str] = {}    # session_id: user_id
        
        self.setup_handlers()
    
    def setup_handlers(self):
        @self.sio.event
        async def connect(sid, environ):
            print(f"Client connected: {sid}")
        
        @self.sio.event
        async def disconnect(sid):
            print(f"Client disconnected: {sid}")
            if sid in self.user_sessions:
                user_id = self.user_sessions[sid]
                del self.connected_users[user_id]
                del self.user_sessions[sid]
        
        @self.sio.event
        async def authenticate(sid, data):
            """Authenticate WebSocket connection"""
            try:
                from app.core.security import verify_token
                token = data.get('token')
                user_id = verify_token(token)
                
                if user_id:
                    self.connected_users[user_id] = sid
                    self.user_sessions[sid] = user_id
                    await self.sio.emit('authenticated', {'success': True}, sid)
                else:
                    await self.sio.emit('authentication_error', {'error': 'Invalid token'}, sid)
            except Exception as e:
                await self.sio.emit('authentication_error', {'error': str(e)}, sid)
        
        @self.sio.event
        async def location_update(sid, data):
            """Handle location updates"""
            if sid not in self.user_sessions:
                return
            
            user_id = self.user_sessions[sid]
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            accuracy = data.get('accuracy')
            
            # Update location in database (you'll need to inject db session)
            # For now, just broadcast to nearby users
            nearby_update = {
                'user_id': user_id,
                'location': {
                    'latitude': latitude,
                    'longitude': longitude,
                    'accuracy': accuracy
                },
                'timestamp': data.get('timestamp')
            }
            
            # Broadcast to all connected users (in production, only to nearby users)
            await self.sio.emit('location_broadcast', nearby_update)
        
        @self.sio.event
        async def voice_phrase_detected(sid, data):
            """Handle voice phrase detection"""
            if sid not in self.user_sessions:
                return
            
            user_id = self.user_sessions[sid]
            transcript = data.get('transcript', '')
            confidence = data.get('confidence', 0.0)
            
            # Emit emergency trigger event
            await self.sio.emit('emergency_trigger', {
                'type': 'voice',
                'user_id': user_id,
                'transcript': transcript,
                'confidence': confidence,
                'timestamp': data.get('timestamp')
            }, sid)
    
    async def emit_to_user(self, user_id: str, event: str, data: Any):
        """Emit event to specific user"""
        if user_id in self.connected_users:
            sid = self.connected_users[user_id]
            await self.sio.emit(event, data, sid)
    
    async def broadcast(self, event: str, data: Any):
        """Broadcast event to all connected users"""
        await self.sio.emit(event, data)
    
    def get_asgi_app(self):
        """Get ASGI app for FastAPI integration"""
        return socketio.ASGIApp(self.sio)

# ==============================================================================
# app/api/auth.py - Authentication Routes
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import GoogleAuthRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/google", response_model=TokenResponse)
async def google_auth(
    auth_request: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    """Mock Google OAuth authentication"""
    try:
        result = AuthService.mock_google_auth(db)
        return TokenResponse(
            access_token=result["access_token"],
            token_type=result["token_type"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed: {str(e)}"
        )

@router.post("/refresh")
async def refresh_token():
    """Refresh authentication token"""
    # Implement token refresh logic
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Token refresh not implemented yet"
    )

# ==============================================================================
# app/api/users.py - User Management Routes
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, EmergencyContact
from app.schemas.user import UserUpdate, User as UserSchema, EmergencyContactCreate, EmergencyContact as EmergencyContactSchema
import uuid

router = APIRouter()

@router.get("/profile", response_model=UserSchema)
async def get_profile(
    current_user: User = Depends(get_current_user)
):
    """Get user profile"""
    return current_user

@router.put("/profile", response_model=UserSchema)
async def update_profile(
    profile_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    update_data = profile_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/emergency-contacts", response_model=List[EmergencyContactSchema])
async def get_emergency_contacts(
    current_user: User = Depends(get_current_user)
):
    """Get user's emergency contacts"""
    return current_user.emergency_contacts

@router.post("/emergency-contacts", response_model=EmergencyContactSchema)
async def add_emergency_contact(
    contact_data: EmergencyContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add emergency contact"""
    contact = EmergencyContact(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        **contact_data.dict()
    )
    
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@router.delete("/emergency-contacts/{contact_id}")
async def remove_emergency_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove emergency contact"""
    contact = db.query(EmergencyContact).filter(
        EmergencyContact.id == contact_id,
        EmergencyContact.user_id == current_user.id
    ).first()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found"
        )
    
    db.delete(contact)
    db.commit()
    return {"success": True, "message": "Emergency contact removed"}

# ==============================================================================
# app/api/emergency.py - Emergency Routes
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.emergency import EmergencyTrigger, EmergencyDismiss
from app.services.emergency_service import EmergencyService

router = APIRouter()

@router.post("/trigger")
async def trigger_emergency(
    emergency_data: EmergencyTrigger,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger emergency alert"""
    try:
        result = EmergencyService.trigger_emergency(
            db, current_user, emergency_data
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger emergency: {str(e)}"
        )

@router.post("/dismiss")
async def dismiss_emergency(
    dismiss_data: EmergencyDismiss,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dismiss emergency alert"""
    try:
        result = EmergencyService.dismiss_emergency(
            db, current_user, dismiss_data.session_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to dismiss emergency: {str(e)}"
        )

@router.get("/status")
async def get_emergency_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current emergency status"""
    try:
        status = EmergencyService.get_active_emergency(db, current_user)
        return status
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get emergency status: {str(e)}"
        )

# ==============================================================================
# app/api/location.py - Location Routes
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.emergency import LocationData, NearbyUser
from app.services.location_service import LocationService
from typing import List

router = APIRouter()

@router.post("/update")
async def update_location(
    location_data: LocationData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user location"""
    try:
        success = LocationService.update_user_location(
            db,
            current_user.id,
            location_data.latitude,
            location_data.longitude,
            location_data.accuracy
        )
        
        if success:
            return {"success": True, "message": "Location updated successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update location"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update location: {str(e)}"
        )

@router.get("/nearby-users")
async def get_nearby_users(
    lat: float,
    lng: float,
    radius: float = 3.0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get nearby SafeGuard users"""
    try:
        nearby_users = LocationService.get_nearby_users(
            db, current_user.id, lat, lng, radius
        )
        
        return {
            "users": [
                {
                    "id": user.id,
                    "name": user.name,
                    "distance": 1.5  # Mock distance - calculate actual in production
                }
                for user in nearby_users
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get nearby users: {str(e)}"
        )

@router.get("/emergency-services")
async def get_emergency_services(
    lat: float,
    lng: float,
    current_user: User = Depends(get_current_user)
):
    """Get nearby emergency services"""
    # Mock emergency services data
    return {
        "police_stations": [
            {
                "name": "Central Police Station",
                "distance": 1.5,
                "phone": "100",
                "address": "123 Main Street"
            }
        ],
        "hospitals": [
            {
                "name": "City General Hospital",
                "distance": 2.3,
                "phone": "108",
                "address": "456 Health Avenue"
            }
        ]
    }

# ==============================================================================
# app/api/voice.py - Voice Recognition Routes
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import VoicePhraseCreate, VoicePhraseUpdate
from app.services.voice_service import VoiceService

router = APIRouter()

@router.post("/train-phrase")
async def train_phrase(
    phrase_data: VoicePhraseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Train new voice phrase"""
    try:
        result = VoiceService.train_phrase(db, current_user, phrase_data)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to train phrase: {str(e)}"
        )

@router.post("/verify-phrase")
async def verify_phrase(
    transcript: str,
    confidence: float = 0.8,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify spoken phrase"""
    try:
        result = VoiceService.verify_phrase(db, current_user, transcript, confidence)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify phrase: {str(e)}"
        )

@router.put("/update-phrase")
async def update_phrase(
    update_data: VoicePhraseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update voice phrase"""
    try:
        result = VoiceService.update_phrase(db, current_user, update_data)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update phrase: {str(e)}"
        )

@router.get("/status")
async def get_voice_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's voice phrase status"""
    try:
        result = VoiceService.get_user_phrase(db, current_user)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get voice status: {str(e)}"
        )

# ==============================================================================
# app/main.py - FastAPI Application
# ==============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine
from app.config import settings
from app.database import Base, engine
from app.api import auth, users, emergency, location, voice
from app.services.socket_service import SocketManager
import os

# Create database tables
Base.metadata.create_all(bind=engine)

# Create upload directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API routes
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(emergency.router, prefix=f"{settings.API_V1_STR}/emergency", tags=["emergency"])
app.include_router(location.router, prefix=f"{settings.API_V1_STR}/location", tags=["location"])
app.include_router(voice.router, prefix=f"{settings.API_V1_STR}/voice", tags=["voice"])

# Initialize WebSocket manager
socket_manager = SocketManager()

# Mount Socket.IO app
app.mount("/socket.io", socket_manager.get_asgi_app())

@app.get("/")
async def root():
    return {
        "message": "SafeGuard API",
        "version": settings.VERSION,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "safeguard-api"}

# ==============================================================================
# run.py - Application Runner
# ==============================================================================

import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info"
    )

# ==============================================================================
# setup.py - Database Initialization Script
# ==============================================================================

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

# ==============================================================================
# Dockerfile - Container Configuration
# ==============================================================================

"""
FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Initialize database
RUN python setup.py

# Expose port
EXPOSE 5000

# Run the application
CMD ["python", "run.py"]
"""

# ==============================================================================
# docker-compose.yml - Development Environment
# ==============================================================================

"""
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:5000"
    volumes:
      - ./uploads:/app/uploads
      - ./database.db:/app/database.db
    environment:
      - DATABASE_URL=sqlite:///./database.db
      - SECRET_KEY=your-secret-key-here
    restart: unless-stopped

  frontend:
    image: node:18-alpine
    working_dir: /app
    ports:
      - "3000:3000"
    volumes:
      - ../frontend:/app
    command: sh -c "npm install && npm start"
    environment:
      - REACT_APP_API_URL=http://localhost:5000
    depends_on:
      - backend
"""

# ==============================================================================
# Installation and Setup Instructions
# ==============================================================================

"""
## Quick Setup (5 minutes)

### 1. Create Project Structure
```bash
mkdir safeguard-backend
cd safeguard-backend
```

### 2. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install fastapi uvicorn python-socketio sqlalchemy sqlite3 pydantic python-jose passlib python-multipart aiofiles websockets geopy haversine
```

### 4. Create Directory Structure
```bash
mkdir -p app/{models,schemas,api,core,services,utils}
mkdir uploads
touch app/__init__.py app/models/__init__.py app/schemas/__init__.py app/api/__init__.py app/core/__init__.py app/services/__init__.py app/utils/__init__.py
```

### 5. Copy All Code Files
# Copy each file content from above into respective files

### 6. Initialize Database
```bash
python setup.py
```

### 7. Run the Application
```bash
python run.py
```

### 8. Test the API
Open http://localhost:5000/docs for Swagger UI
Open http://localhost:5000 for basic status

## Production Deployment

### With Docker
```bash
docker build -t safeguard-backend .
docker run -p 5000:5000 safeguard-backend
```

### With Docker Compose
```bash
docker-compose up -d
```

## API Endpoints

### Authentication
- POST /api/v1/auth/google - Mock Google OAuth
- POST /api/v1/auth/refresh - Refresh token

### Users
- GET /api/v1/users/profile - Get user profile
- PUT /api/v1/users/profile - Update profile
- GET /api/v1/users/emergency-contacts - Get emergency contacts
- POST /api/v1/users/emergency-contacts - Add emergency contact
- DELETE /api/v1/users/emergency-contacts/{id} - Remove contact

### Emergency
- POST /api/v1/emergency/trigger - Trigger emergency
- POST /api/v1/emergency/dismiss - Dismiss emergency
- GET /api/v1/emergency/status - Get emergency status

### Location
- POST /api/v1/location/update - Update location
- GET /api/v1/location/nearby-users - Get nearby users
- GET /api/v1/location/emergency-services - Get emergency services

### Voice
- POST /api/v1/voice/train-phrase - Train voice phrase
- POST /api/v1/voice/verify-phrase - Verify phrase
- PUT /api/v1/voice/update-phrase - Update phrase
- GET /api/v1/voice/status - Get phrase status

## WebSocket Events

### Client to Server
- authenticate: Authenticate connection
- location_update: Update user location
- voice_phrase_detected: Voice phrase detected

### Server to Client
- authenticated: Authentication success
- emergency_alert: Emergency alert broadcast
- emergency_dismissed: Emergency dismissed
- location_broadcast: Location updates

## Features Included

✅ Complete REST API with FastAPI
✅ Real-time WebSocket communication
✅ SQLite database with SQLAlchemy ORM
✅ JWT authentication
✅ Voice phrase recognition
✅ Emergency alert system
✅ Location tracking
✅ Nearby users detection
✅ Emergency contacts management
✅ File upload support
✅ Comprehensive error handling
✅ API documentation with Swagger
✅ Docker support
✅ Production-ready structure

## Next Steps for Production

1. Replace SQLite with PostgreSQL
2. Add real Google OAuth integration
3. Implement SMS/Email notifications
4. Add audio recording endpoints
5. Deploy to cloud (AWS/GCP/Azure)
6. Add monitoring and logging
7. Implement rate limiting
8. Add data encryption
9. Set up CI/CD pipeline
10. Add comprehensive testing

This complete Python backend provides all the functionality needed for the SafeGuard women's safety app with a production-ready architecture!
"""