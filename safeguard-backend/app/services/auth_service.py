from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import create_access_token
import uuid

class AuthService:
    @staticmethod
    def mock_google_auth(db: Session) -> dict:
        """Mock Google OAuth for POC"""
        # Simulate Google user data
        mock_user_data = {
            "email": "demo@safeguard.com",
            "name": "Demo User",
            "picture": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face"
        }
        
        # Check if user exists
        user = db.query(User).filter(User.email == mock_user_data["email"]).first()
        
        if not user:
            # Create new user
            user = User(
                id=str(uuid.uuid4()),
                email=mock_user_data["email"],
                name=mock_user_data["name"],
                profile_picture=mock_user_data["picture"]
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Generate token
        access_token = create_access_token(subject=user.id)
        
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "picture": user.profile_picture
            },
            "access_token": access_token,
            "token_type": "bearer"
        }
