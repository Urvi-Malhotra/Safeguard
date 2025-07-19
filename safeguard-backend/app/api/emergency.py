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
