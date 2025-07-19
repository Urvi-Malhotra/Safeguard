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
