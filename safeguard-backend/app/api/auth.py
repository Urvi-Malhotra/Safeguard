from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/google")
async def google_auth(db: Session = Depends(get_db)):
    """Mock Google OAuth authentication"""
    try:
        result = AuthService.mock_google_auth(db)
        return {
            "success": True,
            "access_token": result["access_token"],
            "token_type": result["token_type"],
            "user": result["user"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed: {str(e)}"
        )

@router.post("/refresh")
async def refresh_token():
    """Refresh authentication token"""
    return {"message": "Token refresh endpoint"}
