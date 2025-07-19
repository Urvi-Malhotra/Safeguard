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
