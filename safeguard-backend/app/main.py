from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Text, Integer, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from pydantic_settings import BaseSettings
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import os
import uuid
import json
import socketio
from jose import jwt
from passlib.context import CryptContext
import httpx
import asyncio

# Configuration
class Settings(BaseSettings):
    PROJECT_NAME: str = "SafeGuard API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "safeguard-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    DATABASE_URL: str = "sqlite:///./database.db"
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000", "https://localhost:3000"]
    
    # Google OAuth (Free tier)
    GOOGLE_CLIENT_ID: str = "your-google-client-id"
    GOOGLE_CLIENT_SECRET: str = "your-google-client-secret"
    
    # Twilio (Free tier for SMS)
    TWILIO_ACCOUNT_SID: str = "your-twilio-sid"
    TWILIO_AUTH_TOKEN: str = "your-twilio-token"
    TWILIO_PHONE: str = "your-twilio-phone"
    
    class Config:
        case_sensitive = True

settings = Settings()

# Database Setup
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(subject: str, expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload.get("sub")
    except jwt.JWTError:
        return None

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Models
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
    google_id = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
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
    priority_order = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())
    
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
    
    user = relationship("User", back_populates="voice_phrases")

class EmergencySession(Base):
    __tablename__ = "emergency_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    trigger_type = Column(String, nullable=False)
    location_lat = Column(Float)
    location_lng = Column(Float)
    status = Column(String, default="active")
    recording_path = Column(String)
    triggered_at = Column(DateTime, default=func.now())
    resolved_at = Column(DateTime)
    emergency_metadata = Column(Text)
    
    user = relationship("User", back_populates="emergency_sessions")

class UserLocation(Base):
    __tablename__ = "user_locations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float)
    timestamp = Column(DateTime, default=func.now())
    is_emergency = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="locations")

# Schemas
class GoogleAuthRequest(BaseModel):
    access_token: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None

class EmergencyContactCreate(BaseModel):
    name: str
    phone: str
    relationship: Optional[str] = None

class VoicePhraseCreate(BaseModel):
    phrase: str
    phrase_password: str

class VoicePhraseUpdate(BaseModel):
    phrase: str
    old_password: str
    new_password: str

class LocationData(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class EmergencyTrigger(BaseModel):
    trigger_type: str
    location: Optional[LocationData] = None
    phrase: Optional[str] = None
    confidence: Optional[float] = None

# WebSocket Manager
class SocketManager:
    def __init__(self):
        self.sio = socketio.AsyncServer(
            cors_allowed_origins=settings.BACKEND_CORS_ORIGINS,
            async_mode='asgi'
        )
        self.connected_users: Dict[str, str] = {}
        self.user_sessions: Dict[str, str] = {}
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
                if user_id in self.connected_users:
                    del self.connected_users[user_id]
                del self.user_sessions[sid]
        
        @self.sio.event
        async def authenticate(sid, data):
            try:
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
            if sid not in self.user_sessions:
                return
            
            user_id = self.user_sessions[sid]
            await self.sio.emit('location_broadcast', {
                'user_id': user_id,
                'location': data.get('location'),
                'timestamp': data.get('timestamp')
            })
        
        @self.sio.event
        async def voice_phrase_detected(sid, data):
            if sid not in self.user_sessions:
                return
            
            user_id = self.user_sessions[sid]
            await self.sio.emit('emergency_trigger', {
                'type': 'voice',
                'user_id': user_id,
                'transcript': data.get('transcript'),
                'confidence': data.get('confidence'),
                'timestamp': data.get('timestamp')
            }, sid)
    
    async def emit_to_user(self, user_id: str, event: str, data: Any):
        if user_id in self.connected_users:
            sid = self.connected_users[user_id]
            await self.sio.emit(event, data, sid)
    
    async def broadcast(self, event: str, data: Any):
        await self.sio.emit(event, data)
    
    def get_asgi_app(self):
        return socketio.ASGIApp(self.sio)

# Services
class AuthService:
    @staticmethod
    async def google_auth(db: Session, access_token: str) -> dict:
        """Real Google OAuth authentication"""
        try:
            # Verify Google token
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://www.googleapis.com/oauth2/v1/userinfo?access_token={access_token}"
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid Google token"
                    )
                
                google_data = response.json()
                
                # Check if user exists
                user = db.query(User).filter(
                    (User.email == google_data["email"]) | 
                    (User.google_id == google_data["id"])
                ).first()
                
                if not user:
                    # Create new user
                    user = User(
                        id=str(uuid.uuid4()),
                        email=google_data["email"],
                        name=google_data["name"],
                        profile_picture=google_data.get("picture"),
                        google_id=google_data["id"]
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
                        "picture": user.profile_picture,
                        "phone": user.phone,
                        "date_of_birth": user.date_of_birth,
                        "gender": user.gender,
                        "address": user.address
                    },
                    "access_token": access_token,
                    "token_type": "bearer"
                }
                
        except Exception as e:
            print(f"Google auth error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google authentication failed"
            )

class NotificationService:
    @staticmethod
    async def send_emergency_sms(phone: str, message: str, location_url: str = None):
        """Send emergency SMS using Twilio (free tier)"""
        try:
            from twilio.rest import Client
            
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            
            full_message = f"🚨 EMERGENCY ALERT: {message}"
            if location_url:
                full_message += f"\n📍 Location: {location_url}"
            
            message = client.messages.create(
                body=full_message,
                from_=settings.TWILIO_PHONE,
                to=phone
            )
            
            return {"success": True, "message_sid": message.sid}
        except Exception as e:
            print(f"SMS error: {e}")
            return {"success": False, "error": str(e)}

class EmergencyService:
    @staticmethod
    async def trigger_emergency(
        db: Session, 
        user: User, 
        emergency_data: EmergencyTrigger,
        socket_manager: SocketManager
    ) -> Dict[str, Any]:
        """Trigger emergency alert with real notifications"""
        
        # Create emergency session
        session = EmergencySession(
            id=str(uuid.uuid4()),
            user_id=user.id,
            trigger_type=emergency_data.trigger_type,
            location_lat=emergency_data.location.latitude if emergency_data.location else None,
            location_lng=emergency_data.location.longitude if emergency_data.location else None,
            emergency_metadata=json.dumps({
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
            db.commit()
        
        # Get emergency contacts
        emergency_contacts = user.emergency_contacts
        
        # Get nearby users (within 3km from last 5 minutes)
        nearby_users = []
        if emergency_data.location:
            recent_time = datetime.utcnow() - timedelta(minutes=5)
            from sqlalchemy import text
            
            query = text("""
                SELECT DISTINCT u.*, 
                       (6371 * acos(cos(radians(:lat)) * cos(radians(ul.latitude)) * 
                       cos(radians(ul.longitude) - radians(:lng)) + 
                       sin(radians(:lat)) * sin(radians(ul.latitude)))) AS distance
                FROM users u
                JOIN user_locations ul ON u.id = ul.user_id
                WHERE ul.timestamp > :recent_time
                AND u.id != :user_id
                AND u.is_active = 1
                HAVING distance < 3
                ORDER BY distance
                LIMIT 10
            """)
            
            result = db.execute(query, {
                "lat": emergency_data.location.latitude,
                "lng": emergency_data.location.longitude,
                "recent_time": recent_time,
                "user_id": user.id
            })
            
            for row in result:
                nearby_user = db.query(User).filter(User.id == row.id).first()
                if nearby_user:
                    nearby_users.append(nearby_user)
        
        # Create location URL for Google Maps
        location_url = None
        if emergency_data.location:
            location_url = f"https://maps.google.com/?q={emergency_data.location.latitude},{emergency_data.location.longitude}"
        
        # Send SMS to emergency contacts
        sms_tasks = []
        for contact in emergency_contacts:
            if contact.phone:
                message = f"{user.name} needs immediate help! Emergency triggered via SafeGuard app."
                sms_tasks.append(
                    NotificationService.send_emergency_sms(
                        contact.phone, 
                        message, 
                        location_url
                    )
                )
        
        # Execute SMS sending
        if sms_tasks:
            await asyncio.gather(*sms_tasks, return_exceptions=True)
        
        # Broadcast via WebSocket to nearby users
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
            "timestamp": session.triggered_at.isoformat(),
            "location_url": location_url
        }
        
        # Notify nearby users via WebSocket
        for nearby_user in nearby_users:
            await socket_manager.emit_to_user(nearby_user.id, "emergency_alert", emergency_broadcast)
        
        # Notify emergency contacts if they're app users
        for contact in emergency_contacts:
            contact_user = db.query(User).filter(User.phone == contact.phone).first()
            if contact_user:
                await socket_manager.emit_to_user(contact_user.id, "emergency_alert", emergency_broadcast)
        
        return {
            "success": True,
            "session_id": session.id,
            "message": "Emergency alert triggered successfully",
            "contacts_notified": len(emergency_contacts),
            "nearby_users_notified": len(nearby_users),
            "location_url": location_url
        }

# Dependencies
from fastapi.security import HTTPBearer
from fastapi import Depends

security = HTTPBearer()

def get_current_user(token: str = Depends(security), db: Session = Depends(get_db)) -> User:
    user_id = verify_token(token.credentials)
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

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize WebSocket manager
socket_manager = SocketManager()

# API Routes
@app.post(f"{settings.API_V1_STR}/auth/google", response_model=TokenResponse)
async def google_auth(auth_request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Real Google OAuth authentication"""
    result = await AuthService.google_auth(db, auth_request.access_token)
    return result

@app.get(f"{settings.API_V1_STR}/users/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get user profile"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "phone": current_user.phone,
        "date_of_birth": current_user.date_of_birth,
        "gender": current_user.gender,
        "address": current_user.address,
        "profile_picture": current_user.profile_picture,
        "created_at": current_user.created_at.isoformat(),
        "updated_at": current_user.updated_at.isoformat()
    }

@app.put(f"{settings.API_V1_STR}/users/profile")
async def update_profile(
    profile_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    update_data = profile_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return {
        "success": True,
        "message": "Profile updated successfully",
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "phone": current_user.phone,
            "date_of_birth": current_user.date_of_birth,
            "gender": current_user.gender,
            "address": current_user.address,
            "profile_picture": current_user.profile_picture
        }
    }

@app.get(f"{settings.API_V1_STR}/users/emergency-contacts")
async def get_emergency_contacts(current_user: User = Depends(get_current_user)):
    """Get user's emergency contacts"""
    return [
        {
            "id": contact.id,
            "name": contact.name,
            "phone": contact.phone,
            "relationship": contact.relationship,
            "priority_order": contact.priority_order,
            "created_at": contact.created_at.isoformat()
        }
        for contact in current_user.emergency_contacts
    ]

@app.post(f"{settings.API_V1_STR}/users/emergency-contacts")
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
    
    return {
        "id": contact.id,
        "name": contact.name,
        "phone": contact.phone,
        "relationship": contact.relationship,
        "priority_order": contact.priority_order,
        "created_at": contact.created_at.isoformat()
    }

@app.delete(f"{settings.API_V1_STR}/users/emergency-contacts/{{contact_id}}")
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

@app.post(f"{settings.API_V1_STR}/voice/train-phrase")
async def train_phrase(
    phrase_data: VoicePhraseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Train new voice phrase"""
    # Deactivate existing phrases
    db.query(VoicePhrase).filter(VoicePhrase.user_id == current_user.id).update(
        {"is_active": False}
    )
    
    # Create new phrase
    voice_phrase = VoicePhrase(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
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

@app.get(f"{settings.API_V1_STR}/voice/status")
async def get_voice_status(current_user: User = Depends(get_current_user)):
    """Get user's voice phrase status"""
    active_phrase = None
    for phrase in current_user.voice_phrases:
        if phrase.is_active:
            active_phrase = phrase
            break
    
    if active_phrase:
        return {
            "has_phrase": True,
            "phrase": active_phrase.phrase,
            "created_at": active_phrase.created_at.isoformat()
        }
    
    return {"has_phrase": False}

@app.put(f"{settings.API_V1_STR}/voice/update-phrase")
async def update_phrase(
    update_data: VoicePhraseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update voice phrase"""
    active_phrase = None
    for phrase in current_user.voice_phrases:
        if phrase.is_active:
            active_phrase = phrase
            break
    
    if not active_phrase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active phrase found"
        )
    
    # Verify old password
    if not verify_password(update_data.old_password, active_phrase.phrase_password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password"
        )
    
    # Update phrase
    active_phrase.phrase = update_data.phrase.lower().strip()
    active_phrase.phrase_password_hash = get_password_hash(update_data.new_password)
    active_phrase.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "success": True,
        "message": "Voice phrase updated successfully"
    }

@app.post(f"{settings.API_V1_STR}/voice/verify-phrase")
async def verify_phrase(
    transcript: str,
    confidence: float = 0.8,
    current_user: User = Depends(get_current_user)
):
    """Verify if spoken text matches trained phrase"""
    active_phrase = None
    for phrase in current_user.voice_phrases:
        if phrase.is_active:
            active_phrase = phrase
            break
    
    if not active_phrase:
        return {"match": False, "message": "No active phrase found"}
    
    # Simple phrase matching
    spoken_lower = transcript.lower().strip()
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

@app.post(f"{settings.API_V1_STR}/location/update")
async def update_location(
    location_data: LocationData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user location"""
    location = UserLocation(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        latitude=location_data.latitude,
        longitude=location_data.longitude,
        accuracy=location_data.accuracy
    )
    
    db.add(location)
    db.commit()
    
    return {"success": True, "message": "Location updated successfully"}

@app.get(f"{settings.API_V1_STR}/location/nearby-users")
async def get_nearby_users(
    lat: float,
    lng: float,
    radius: float = 3.0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get nearby SafeGuard users"""
    from sqlalchemy import text
    
    recent_time = datetime.utcnow() - timedelta(minutes=5)
    
    query = text("""
        SELECT DISTINCT u.*, 
               (6371 * acos(cos(radians(:lat)) * cos(radians(ul.latitude)) * 
               cos(radians(ul.longitude) - radians(:lng)) + 
               sin(radians(:lat)) * sin(radians(ul.latitude)))) AS distance
        FROM users u
        JOIN user_locations ul ON u.id = ul.user_id
        WHERE ul.timestamp > :recent_time
        AND u.id != :user_id
        AND u.is_active = 1
        HAVING distance < :radius
        ORDER BY distance
        LIMIT 10
    """)
    
    result = db.execute(query, {
        "lat": lat,
        "lng": lng,
        "recent_time": recent_time,
        "user_id": current_user.id,
        "radius": radius
    })
    
    nearby_users = []
    for row in result:
        user = db.query(User).filter(User.id == row.id).first()
        if user:
            nearby_users.append({
                "id": user.id,
                "name": user.name,
                "distance": round(row.distance, 2)
            })
    
    return {"users": nearby_users}

@app.post(f"{settings.API_V1_STR}/emergency/trigger")
async def trigger_emergency(
    emergency_data: EmergencyTrigger,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger emergency alert"""
    try:
        result = await EmergencyService.trigger_emergency(
            db, current_user, emergency_data, socket_manager
        )
        return result
    except Exception as e:
        print(f"Emergency trigger error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger emergency: {str(e)}"
        )

@app.post(f"{settings.API_V1_STR}/emergency/dismiss")
async def dismiss_emergency(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dismiss emergency alert"""
    from sqlalchemy import and_
    
    session = db.query(EmergencySession).filter(
        and_(
            EmergencySession.id == session_id,
            EmergencySession.user_id == current_user.id,
            EmergencySession.status == "active"
        )
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency session not found or already resolved"
        )
    
    # Update session status
    session.status = "dismissed"
    session.resolved_at = datetime.utcnow()
    db.commit()
    
    # Broadcast dismissal
    dismissal_data = {
        "session_id": session_id,
        "user_id": current_user.id,
        "dismissed_at": session.resolved_at.isoformat()
    }
    await socket_manager.broadcast("emergency_dismissed", dismissal_data)
    
    return {
        "success": True,
        "message": "Emergency dismissed successfully"
    }

@app.get(f"{settings.API_V1_STR}/emergency/status")
async def get_emergency_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current emergency status"""
    from sqlalchemy import and_
    
    session = db.query(EmergencySession).filter(
        and_(
            EmergencySession.user_id == current_user.id,
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)

