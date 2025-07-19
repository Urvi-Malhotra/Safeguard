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
