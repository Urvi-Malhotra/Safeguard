const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    GOOGLE: `${API_BASE_URL}/api/v1/auth/google`,
    REFRESH: `${API_BASE_URL}/api/v1/auth/refresh`,
  },
  
  // User endpoints
  USERS: {
    PROFILE: `${API_BASE_URL}/api/v1/users/profile`,
    EMERGENCY_CONTACTS: `${API_BASE_URL}/api/v1/users/emergency-contacts`,
  },
  
  // Emergency endpoints
  EMERGENCY: {
    TRIGGER: `${API_BASE_URL}/api/v1/emergency/trigger`,
    DISMISS: `${API_BASE_URL}/api/v1/emergency/dismiss`,
    STATUS: `${API_BASE_URL}/api/v1/emergency/status`,
  },
  
  // Location endpoints
  LOCATION: {
    UPDATE: `${API_BASE_URL}/api/v1/location/update`,
    NEARBY_USERS: `${API_BASE_URL}/api/v1/location/nearby-users`,
    EMERGENCY_SERVICES: `${API_BASE_URL}/api/v1/location/emergency-services`,
  },
  
  // Voice endpoints
  VOICE: {
    TRAIN_PHRASE: `${API_BASE_URL}/api/v1/voice/train-phrase`,
    VERIFY_PHRASE: `${API_BASE_URL}/api/v1/voice/verify-phrase`,
    UPDATE_PHRASE: `${API_BASE_URL}/api/v1/voice/update-phrase`,
    STATUS: `${API_BASE_URL}/api/v1/voice/status`,
  }
};

export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
