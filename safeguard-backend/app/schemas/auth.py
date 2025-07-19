from pydantic import BaseModel, EmailStr
from typing import Optional

class GoogleAuthRequest(BaseModel):
    google_token: Optional[str] = None  # For real Google OAuth
    
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
class UserLogin(BaseModel):
    email: EmailStr
    
class UserInToken(BaseModel):
    user_id: str
    email: str