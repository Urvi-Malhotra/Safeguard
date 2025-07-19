from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine
from app.config import settings
from app.database import Base, engine
from app.api import auth, users, emergency, location, voice
from app.services.socket_service import SocketManager
import os

# Create database tables
Base.metadata.create_all(bind=engine)

# Create upload directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API routes
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(emergency.router, prefix=f"{settings.API_V1_STR}/emergency", tags=["emergency"])
app.include_router(location.router, prefix=f"{settings.API_V1_STR}/location", tags=["location"])
app.include_router(voice.router, prefix=f"{settings.API_V1_STR}/voice", tags=["voice"])

# Initialize WebSocket manager
socket_manager = SocketManager()

# Mount Socket.IO app
app.mount("/socket.io", socket_manager.get_asgi_app())

@app.get("/")
async def root():
    return {
        "message": "SafeGuard API",
        "version": settings.VERSION,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "safeguard-api"}
