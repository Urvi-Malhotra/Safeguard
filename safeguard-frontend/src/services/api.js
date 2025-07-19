import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
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
  googleLogin: () => api.post(API_ENDPOINTS.AUTH.GOOGLE),
  refreshToken: () => api.post(API_ENDPOINTS.AUTH.REFRESH),
};

// User API
export const userAPI = {
  getProfile: () => api.get(API_ENDPOINTS.USERS.PROFILE),
  updateProfile: (data) => api.put(API_ENDPOINTS.USERS.PROFILE, data),
  getEmergencyContacts: () => api.get(API_ENDPOINTS.USERS.EMERGENCY_CONTACTS),
  addEmergencyContact: (data) => api.post(API_ENDPOINTS.USERS.EMERGENCY_CONTACTS, data),
  removeEmergencyContact: (id) => api.delete(`${API_ENDPOINTS.USERS.EMERGENCY_CONTACTS}/${id}`),
};

// Emergency API
export const emergencyAPI = {
  trigger: (data) => api.post(API_ENDPOINTS.EMERGENCY.TRIGGER, data),
  dismiss: (data) => api.post(API_ENDPOINTS.EMERGENCY.DISMISS, data),
  getStatus: () => api.get(API_ENDPOINTS.EMERGENCY.STATUS),
};

// Location API
export const locationAPI = {
  update: (data) => api.post(API_ENDPOINTS.LOCATION.UPDATE, data),
  getNearbyUsers: (lat, lng, radius = 3.0) => 
    api.get(`${API_ENDPOINTS.LOCATION.NEARBY_USERS}?lat=${lat}&lng=${lng}&radius=${radius}`),
  getEmergencyServices: (lat, lng) => 
    api.get(`${API_ENDPOINTS.LOCATION.EMERGENCY_SERVICES}?lat=${lat}&lng=${lng}`),
};

// Voice API
export const voiceAPI = {
  trainPhrase: (data) => api.post(API_ENDPOINTS.VOICE.TRAIN_PHRASE, data),
  verifyPhrase: (transcript, confidence = 0.8) => 
    api.post(`${API_ENDPOINTS.VOICE.VERIFY_PHRASE}?transcript=${transcript}&confidence=${confidence}`),
  updatePhrase: (data) => api.put(API_ENDPOINTS.VOICE.UPDATE_PHRASE, data),
  getStatus: () => api.get(API_ENDPOINTS.VOICE.STATUS),
};

export default api;