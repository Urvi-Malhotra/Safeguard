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
