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
