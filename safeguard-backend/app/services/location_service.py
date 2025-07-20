from sqlalchemy.orm import Session
from sqlalchemy import and_, func, text
from app.models.user import User
from app.models.location import UserLocation
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
