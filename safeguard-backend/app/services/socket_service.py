import socketio
from typing import Dict, Any
import asyncio
import json

class SocketManager:
    def __init__(self):
        self.sio = socketio.AsyncServer(
            cors_allowed_origins=["http://localhost:3000"],
            async_mode='asgi'
        )
        self.connected_users: Dict[str, str] = {}  # user_id: session_id
        self.user_sessions: Dict[str, str] = {}    # session_id: user_id
        
        self.setup_handlers()
    
    def setup_handlers(self):
        @self.sio.event
        async def connect(sid, environ):
            print(f"Client connected: {sid}")
        
        @self.sio.event
        async def disconnect(sid):
            print(f"Client disconnected: {sid}")
            if sid in self.user_sessions:
                user_id = self.user_sessions[sid]
                del self.connected_users[user_id]
                del self.user_sessions[sid]
        
        @self.sio.event
        async def authenticate(sid, data):
            """Authenticate WebSocket connection"""
            try:
                from app.core.security import verify_token
                token = data.get('token')
                user_id = verify_token(token)
                
                if user_id:
                    self.connected_users[user_id] = sid
                    self.user_sessions[sid] = user_id
                    await self.sio.emit('authenticated', {'success': True}, sid)
                else:
                    await self.sio.emit('authentication_error', {'error': 'Invalid token'}, sid)
            except Exception as e:
                await self.sio.emit('authentication_error', {'error': str(e)}, sid)
        
        @self.sio.event
        async def location_update(sid, data):
            """Handle location updates"""
            if sid not in self.user_sessions:
                return
            
            user_id = self.user_sessions[sid]
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            accuracy = data.get('accuracy')
            
            # Update location in database (you'll need to inject db session)
            # For now, just broadcast to nearby users
            nearby_update = {
                'user_id': user_id,
                'location': {
                    'latitude': latitude,
                    'longitude': longitude,
                    'accuracy': accuracy
                },
                'timestamp': data.get('timestamp')
            }
            
            # Broadcast to all connected users (in production, only to nearby users)
            await self.sio.emit('location_broadcast', nearby_update)
        
        @self.sio.event
        async def voice_phrase_detected(sid, data):
            """Handle voice phrase detection"""
            if sid not in self.user_sessions:
                return
            
            user_id = self.user_sessions[sid]
            transcript = data.get('transcript', '')
            confidence = data.get('confidence', 0.0)
            
            # Emit emergency trigger event
            await self.sio.emit('emergency_trigger', {
                'type': 'voice',
                'user_id': user_id,
                'transcript': transcript,
                'confidence': confidence,
                'timestamp': data.get('timestamp')
            }, sid)
    
    async def emit_to_user(self, user_id: str, event: str, data: Any):
        """Emit event to specific user"""
        if user_id in self.connected_users:
            sid = self.connected_users[user_id]
            await self.sio.emit(event, data, sid)
    
    async def broadcast(self, event: str, data: Any):
        """Broadcast event to all connected users"""
        await self.sio.emit(event, data)
    
    def get_asgi_app(self):
        """Get ASGI app for FastAPI integration"""
        return socketio.ASGIApp(self.sio)
