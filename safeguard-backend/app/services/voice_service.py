from sqlalchemy.orm import Session
from app.models.user import User, VoicePhrase
from app.core.security import get_password_hash, verify_password
from app.schemas.user import VoicePhraseCreate, VoicePhraseUpdate
import uuid

class VoiceService:
    @staticmethod
    def train_phrase(db: Session, user: User, phrase_data: VoicePhraseCreate) -> dict:
        """Train new voice phrase"""
        
        # Deactivate existing phrases
        db.query(VoicePhrase).filter(VoicePhrase.user_id == user.id).update(
            {"is_active": False}
        )
        
        # Create new phrase
        voice_phrase = VoicePhrase(
            id=str(uuid.uuid4()),
            user_id=user.id,
            phrase=phrase_data.phrase.lower().strip(),
            phrase_password_hash=get_password_hash(phrase_data.phrase_password),
            is_active=True
        )
        
        db.add(voice_phrase)
        db.commit()
        db.refresh(voice_phrase)
        
        return {
            "success": True,
            "phrase_id": voice_phrase.id,
            "message": "Voice phrase trained successfully"
        }
    
    @staticmethod
    def verify_phrase(db: Session, user: User, spoken_text: str, confidence: float = 0.8) -> dict:
        """Verify if spoken text matches trained phrase"""
        
        active_phrase = db.query(VoicePhrase).filter(
            VoicePhrase.user_id == user.id,
            VoicePhrase.is_active == True
        ).first()
        
        if not active_phrase:
            return {"match": False, "message": "No active phrase found"}
        
        # Simple phrase matching (in production, use advanced voice recognition)
        spoken_lower = spoken_text.lower().strip()
        phrase_lower = active_phrase.phrase.lower().strip()
        
        # Check if phrase is contained in spoken text
        if phrase_lower in spoken_lower and confidence >= 0.6:
            return {
                "match": True,
                "phrase_id": active_phrase.id,
                "confidence": confidence,
                "message": "Phrase matched successfully"
            }
        
        return {"match": False, "message": "Phrase not matched"}
    
    @staticmethod
    def update_phrase(db: Session, user: User, update_data: VoicePhraseUpdate) -> dict:
        """Update existing voice phrase"""
        
        active_phrase = db.query(VoicePhrase).filter(
            VoicePhrase.user_id == user.id,
            VoicePhrase.is_active == True
        ).first()
        
        if not active_phrase:
            return {"success": False, "message": "No active phrase found"}
        
        # Verify old password
        if not verify_password(update_data.old_password, active_phrase.phrase_password_hash):
            return {"success": False, "message": "Invalid password"}
        
        # Update phrase
        active_phrase.phrase = update_data.phrase.lower().strip()
        active_phrase.phrase_password_hash = get_password_hash(update_data.new_password)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Voice phrase updated successfully"
        }
    
    @staticmethod
    def get_user_phrase(db: Session, user: User) -> dict:
        """Get user's active voice phrase"""
        
        active_phrase = db.query(VoicePhrase).filter(
            VoicePhrase.user_id == user.id,
            VoicePhrase.is_active == True
        ).first()
        
        if active_phrase:
            return {
                "has_phrase": True,
                "phrase": active_phrase.phrase,
                "created_at": active_phrase.created_at.isoformat()
            }
        
        return {"has_phrase": False}
