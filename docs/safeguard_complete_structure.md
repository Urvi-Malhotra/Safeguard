# SafeGuard Women's Safety App - Complete Project Structure

## Main Project Directory Structure

```
safeguard-app/
├── safeguard-backend/                 # Python FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── config.py                  # Configuration settings
│   │   ├── database.py                # Database setup
│   │   │
│   │   ├── models/                    # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── user.py               # User, EmergencyContact, VoicePhrase models
│   │   │   ├── emergency.py          # EmergencySession, EmergencyAlert models
│   │   │   └── location.py           # UserLocation model
│   │   │
│   │   ├── schemas/                   # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py               # User schemas
│   │   │   ├── emergency.py          # Emergency schemas
│   │   │   └── auth.py               # Authentication schemas
│   │   │
│   │   ├── api/                      # API routes
│   │   │   ├── __init__.py
│   │   │   ├── auth.py               # Authentication endpoints
│   │   │   ├── users.py              # User management endpoints
│   │   │   ├── emergency.py          # Emergency endpoints
│   │   │   ├── location.py           # Location endpoints
│   │   │   └── voice.py              # Voice recognition endpoints
│   │   │
│   │   ├── core/                     # Core functionality
│   │   │   ├── __init__.py
│   │   │   ├── security.py           # JWT, password hashing
│   │   │   ├── config.py             # Core configuration
│   │   │   └── dependencies.py       # FastAPI dependencies
│   │   │
│   │   ├── services/                 # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py       # Authentication logic
│   │   │   ├── emergency_service.py  # Emergency handling
│   │   │   ├── location_service.py   # Location tracking
│   │   │   ├── voice_service.py      # Voice recognition
│   │   │   └── socket_service.py     # WebSocket management
│   │   │
│   │   └── utils/                    # Utilities
│   │       ├── __init__.py
│   │       ├── helpers.py            # Helper functions
│   │       └── constants.py          # Constants
│   │
│   ├── uploads/                      # File storage directory
│   ├── database.db                   # SQLite database file
│   ├── requirements.txt              # Python dependencies
│   ├── setup.py                      # Database initialization
│   ├── run.py                        # Application runner
│   ├── Dockerfile                    # Docker configuration
│   └── .env                          # Environment variables
│
├── safeguard-frontend/               # React Frontend
│   ├── public/
│   │   ├── index.html               # HTML template
│   │   ├── manifest.json            # PWA manifest
│   │   ├── sw.js                    # Service worker
│   │   ├── favicon.ico              # App icon
│   │   └── robots.txt               # SEO robots file
│   │
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── Layout/
│   │   │   │   └── Layout.js        # Main layout wrapper
│   │   │   │
│   │   │   ├── Emergency/
│   │   │   │   ├── EmergencyBanner.js    # Emergency alert banner
│   │   │   │   └── EmergencyButton.js    # Emergency trigger button
│   │   │   │
│   │   │   ├── Voice/
│   │   │   │   └── VoiceControl.js       # Voice recognition control
│   │   │   │
│   │   │   ├── Location/
│   │   │   │   └── LocationStatus.js     # Location status display
│   │   │   │
│   │   │   ├── Contacts/
│   │   │   │   └── EmergencyContacts.js  # Emergency contacts manager
│   │   │   │
│   │   │   ├── Profile/
│   │   │   │   └── ProfileManagement.js  # User profile management
│   │   │   │
│   │   │   └── Notifications/
│   │   │       └── NotificationCenter.js # Notification center
│   │   │
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useVoiceRecognition.js    # Voice recognition hook
│   │   │   ├── useLocation.js            # Location tracking hook
│   │   │   └── useEmergency.js           # Emergency management hook
│   │   │
│   │   ├── services/                # API and external services
│   │   │   ├── api.js               # Main API service with Axios
│   │   │   └── socketService.js     # WebSocket service
│   │   │
│   │   ├── store/                   # State management
│   │   │   └── useStore.js          # Zustand stores (auth, emergency, location, voice, app)
│   │   │
│   │   ├── config/                  # Configuration
│   │   │   └── api.js              # API endpoints configuration
│   │   │
│   │   ├── pages/                   # Page components
│   │   │   ├── Login.js            # Login page
│   │   │   └── Dashboard.js        # Main dashboard
│   │   │
│   │   ├── utils/                   # Utility functions
│   │   │   └── helpers.js          # Helper functions
│   │   │
│   │   ├── App.js                  # Main App component
│   │   ├── index.js                # React entry point
│   │   └── index.css               # Global styles (includes Tailwind)
│   │
│   ├── package.json                # Node.js dependencies
│   ├── package-lock.json           # Dependency lock file
│   ├── .env                        # Environment variables
│   ├── .gitignore                  # Git ignore rules
│   └── README.md                   # Frontend documentation
│
├── docker-compose.yml              # Full stack Docker setup
├── .gitignore                      # Root git ignore
├── README.md                       # Project documentation
└── docs/                          # Additional documentation
    ├── API.md                     # API documentation
    ├── DEPLOYMENT.md              # Deployment guide
    └── ARCHITECTURE.md            # Architecture overview
```

## Key Files Content Summary

### Backend Files (Python FastAPI)

**requirements.txt**
```txt
fastapi==0.104.1
uvicorn==0.24.0
python-socketio==5.9.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
aiofiles==23.2.1
websockets==12.0
geopy==2.4.1
haversine==2.8.0
```

**app/main.py** - FastAPI application with:
- CORS middleware
- API routers for auth, users, emergency, location, voice
- WebSocket integration
- Static file serving

**app/database.py** - SQLAlchemy setup with SQLite

**app/models/** - Database models:
- `user.py`: User, EmergencyContact, VoicePhrase
- `emergency.py`: EmergencySession, EmergencyAlert
- `location.py`: UserLocation

**app/services/** - Business logic:
- `auth_service.py`: Mock Google OAuth
- `emergency_service.py`: Emergency handling & alerts
- `location_service.py`: Location tracking & nearby users
- `voice_service.py`: Voice phrase training & verification
- `socket_service.py`: Real-time WebSocket communication

### Frontend Files (React)

**package.json** - Dependencies:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.1",
    "axios": "^1.4.0",
    "socket.io-client": "^4.7.2",
    "lucide-react": "^0.263.1",
    "react-hot-toast": "^2.4.1",
    "zustand": "^4.3.8",
    "date-fns": "^2.30.0"
  }
}
```

**src/App.js** - Main application with:
- React Router setup
- Authentication flow
- Route protection

**src/store/useStore.js** - Zustand stores:
- `useAuthStore`: User authentication state
- `useEmergencyStore`: Emergency session state
- `useLocationStore`: Location tracking state
- `useVoiceStore`: Voice recognition state
- `useAppStore`: App-wide state (contacts, notifications)

**src/services/api.js** - Axios API client with:
- Authentication interceptors
- Error handling
- API endpoints for all features

**src/hooks/** - Custom hooks:
- `useVoiceRecognition`: Browser Speech Recognition API
- `useLocation`: HTML5 Geolocation API
- `useEmergency`: Emergency management logic

## Setup Instructions

### 1. Clone/Create Project Structure
```bash
mkdir safeguard-app
cd safeguard-app
```

### 2. Backend Setup
```bash
mkdir safeguard-backend
cd safeguard-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create directory structure
mkdir -p app/{models,schemas,api,core,services,utils}
mkdir uploads
touch app/__init__.py app/models/__init__.py app/schemas/__init__.py app/api/__init__.py app/core/__init__.py app/services/__init__.py app/utils/__init__.py

# Copy all Python files to respective locations
# Initialize database
python setup.py

# Start backend
python run.py
```

### 3. Frontend Setup
```bash
cd ../
npx create-react-app safeguard-frontend
cd safeguard-frontend

# Install additional dependencies
npm install react-router-dom axios socket.io-client lucide-react react-hot-toast zustand date-fns

# Copy all React files to respective locations
# Start frontend
npm start
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Docs**: http://localhost:5000/docs

## Environment Variables

### Backend (.env)
```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./database.db
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Docker Setup (Optional)

**docker-compose.yml** (in root directory):
```yaml
version: '3.8'
services:
  backend:
    build: ./safeguard-backend
    ports:
      - "5000:5000"
    volumes:
      - ./safeguard-backend/uploads:/app/uploads
      - ./safeguard-backend/database.db:/app/database.db
    
  frontend:
    build: ./safeguard-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

Run with: `docker-compose up -d`

## Features Included

### Backend Features
✅ FastAPI with async support
✅ SQLAlchemy ORM with SQLite
✅ JWT authentication (mock Google OAuth)
✅ WebSocket real-time communication
✅ RESTful API with auto-generated docs
✅ Emergency alert system
✅ Location tracking & nearby users
✅ Voice phrase training & verification
✅ Emergency contacts management
✅ File upload support

### Frontend Features
✅ Modern React 18 with hooks
✅ React Router for navigation
✅ Zustand for state management
✅ Socket.IO for real-time updates
✅ Tailwind CSS for styling
✅ Progressive Web App (PWA) ready
✅ Voice recognition integration
✅ Geolocation tracking
✅ Emergency button with hold-to-trigger
✅ Real-time notifications
✅ Responsive mobile-first design

## Production Deployment

### Backend
- Deploy to Railway, Render, or Heroku
- Replace SQLite with PostgreSQL
- Set up environment variables
- Configure CORS for production domain

### Frontend
- Build: `npm run build`
- Deploy to Netlify, Vercel, or GitHub Pages
- Update API URL environment variables
- Enable HTTPS for voice recognition

This complete structure provides a fully functional women's safety app with real-time emergency alerts, voice recognition, location tracking, and comprehensive user management!