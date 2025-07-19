from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None

class User(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class EmergencyContactBase(BaseModel):
    name: str
    phone: str
    relationship: Optional[str] = None
    priority_order: Optional[int] = 1

class EmergencyContactCreate(EmergencyContactBase):
    pass

class EmergencyContact(EmergencyContactBase):
    id: str
    user_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class VoicePhraseBase(BaseModel):
    phrase: str

class VoicePhraseCreate(VoicePhraseBase):
    phrase_password: str

class VoicePhraseUpdate(BaseModel):
    phrase: str
    old_password: str
    new_password: str

class VoicePhrase(VoicePhraseBase):
    id: str
    user_id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
