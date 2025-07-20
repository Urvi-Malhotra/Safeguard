import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'demo-token-for-testing') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  googleLogin: (accessToken) => api.post('/api/v1/auth/google', { access_token: accessToken }),
  refreshToken: () => api.post('/api/v1/auth/refresh'),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/api/v1/users/profile'),
  updateProfile: (data) => api.put('/api/v1/users/profile', data),
  getEmergencyContacts: () => api.get('/api/v1/users/emergency-contacts'),
  addEmergencyContact: (data) => api.post('/api/v1/users/emergency-contacts', data),
  removeEmergencyContact: (id) => api.delete(`/api/v1/users/emergency-contacts/${id}`),
};

// Emergency API
export const emergencyAPI = {
  trigger: (data) => api.post('/api/v1/emergency/trigger', data),
  dismiss: (sessionId) => api.post('/api/v1/emergency/dismiss', { session_id: sessionId }),
  getStatus: () => api.get('/api/v1/emergency/status'),
};

// Location API
export const locationAPI = {
  update: (data) => api.post('/api/v1/location/update', data),
  getNearbyUsers: (lat, lng, radius = 3.0) => 
    api.get(`/api/v1/location/nearby-users?lat=${lat}&lng=${lng}&radius=${radius}`),
  getEmergencyServices: (lat, lng) => 
    api.get(`/api/v1/location/emergency-services?lat=${lat}&lng=${lng}`),
};

// Voice API
export const voiceAPI = {
  trainPhrase: (data) => api.post('/api/v1/voice/train-phrase', data),
  verifyPhrase: (transcript, confidence = 0.8) => 
    api.post(`/api/v1/voice/verify-phrase?transcript=${encodeURIComponent(transcript)}&confidence=${confidence}`),
  updatePhrase: (data) => api.put('/api/v1/voice/update-phrase', data),
  getStatus: () => api.get('/api/v1/voice/status'),
};

export default api;


