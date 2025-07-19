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
