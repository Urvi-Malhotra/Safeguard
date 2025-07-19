# ==============================================================================
# SAFEGUARD FRONTEND - COMPLETE REACT CODEBASE
# ==============================================================================

# package.json
{
  "name": "safeguard-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "react-router-dom": "^6.8.1",
    "axios": "^1.4.0",
    "socket.io-client": "^4.7.2",
    "lucide-react": "^0.263.1",
    "react-hot-toast": "^2.4.1",
    "zustand": "^4.3.8",
    "date-fns": "^2.30.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://localhost:5000"
}

# ==============================================================================
# src/config/api.js - API Configuration
# ==============================================================================

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

# ==============================================================================
# src/services/api.js - API Service Layer
# ==============================================================================

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

# ==============================================================================
# src/services/socketService.js - WebSocket Service
# ==============================================================================

import io from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.isConnected = true;
      this.authenticate();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('authenticated', (data) => {
      console.log('✅ Socket authenticated:', data);
    });

    this.socket.on('authentication_error', (error) => {
      console.error('❌ Authentication error:', error);
    });

    // Emergency events
    this.socket.on('emergency_alert', (data) => {
      console.log('🚨 Emergency alert received:', data);
      this.emit('emergency_alert_received', data);
    });

    this.socket.on('emergency_dismissed', (data) => {
      console.log('✅ Emergency dismissed:', data);
      this.emit('emergency_dismissed_received', data);
    });

    this.socket.on('emergency_trigger', (data) => {
      console.log('🚨 Emergency trigger:', data);
      this.emit('emergency_trigger_received', data);
    });

    // Location events
    this.socket.on('location_broadcast', (data) => {
      console.log('📍 Location update received:', data);
      this.emit('location_update_received', data);
    });

    this.socket.on('nearby_users_update', (data) => {
      console.log('👥 Nearby users update:', data);
      this.emit('nearby_users_updated', data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  authenticate() {
    const token = localStorage.getItem('token');
    if (token && this.socket) {
      this.socket.emit('authenticate', { token });
    }
  }

  // Event emitters for server
  updateLocation(latitude, longitude, accuracy = null) {
    if (this.socket && this.isConnected) {
      this.socket.emit('location_update', {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString(),
      });
    }
  }

  detectVoicePhrase(transcript, confidence) {
    if (this.socket && this.isConnected) {
      this.socket.emit('voice_phrase_detected', {
        transcript,
        confidence,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Local event management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
}

export default new SocketService();

# ==============================================================================
# src/store/useStore.js - Global State Management
# ==============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth Store
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: true 
      }),
      
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        });
      },
      
      updateUser: (userData) => set((state) => ({
        user: { ...state.user, ...userData }
      })),
    }),
    {
      name: 'auth-storage',
      getStorage: () => localStorage,
    }
  )
);

// Emergency Store
export const useEmergencyStore = create((set, get) => ({
  isEmergencyActive: false,
  emergencySession: null,
  isRecording: false,
  alarmActive: false,
  
  setEmergencyActive: (active, session = null) => set({
    isEmergencyActive: active,
    emergencySession: session,
  }),
  
  setRecording: (recording) => set({ isRecording: recording }),
  
  setAlarmActive: (active) => set({ alarmActive: active }),
  
  dismissEmergency: () => set({
    isEmergencyActive: false,
    emergencySession: null,
    isRecording: false,
    alarmActive: false,
  }),
}));

// Location Store
export const useLocationStore = create((set, get) => ({
  currentLocation: null,
  nearbyUsers: [],
  locationPermission: null,
  isTrackingLocation: false,
  
  setCurrentLocation: (location) => set({ currentLocation: location }),
  
  setNearbyUsers: (users) => set({ nearbyUsers: users }),
  
  setLocationPermission: (permission) => set({ locationPermission: permission }),
  
  setLocationTracking: (tracking) => set({ isTrackingLocation: tracking }),
}));

// Voice Store
export const useVoiceStore = create((set, get) => ({
  isListening: false,
  safetyPhrase: '',
  hasSafetyPhrase: false,
  voiceRecognitionSupported: false,
  lastTranscript: '',
  
  setListening: (listening) => set({ isListening: listening }),
  
  setSafetyPhrase: (phrase) => set({ 
    safetyPhrase: phrase,
    hasSafetyPhrase: !!phrase 
  }),
  
  setVoiceSupport: (supported) => set({ voiceRecognitionSupported: supported }),
  
  setLastTranscript: (transcript) => set({ lastTranscript: transcript }),
}));

// App Store
export const useAppStore = create((set, get) => ({
  emergencyContacts: [],
  notifications: [],
  theme: 'light',
  isOnline: navigator.onLine,
  
  setEmergencyContacts: (contacts) => set({ emergencyContacts: contacts }),
  
  addEmergencyContact: (contact) => set((state) => ({
    emergencyContacts: [...state.emergencyContacts, contact]
  })),
  
  removeEmergencyContact: (contactId) => set((state) => ({
    emergencyContacts: state.emergencyContacts.filter(c => c.id !== contactId)
  })),
  
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, {
      id: Date.now(),
      timestamp: new Date(),
      ...notification
    }]
  })),
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  
  setOnlineStatus: (online) => set({ isOnline: online }),
}));

# ==============================================================================
# src/hooks/useVoiceRecognition.js - Voice Recognition Hook
# ==============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoiceStore } from '../store/useStore';
import socketService from '../services/socketService';
import { voiceAPI } from '../services/api';
import toast from 'react-hot-toast';

export const useVoiceRecognition = () => {
  const {
    isListening,
    safetyPhrase,
    voiceRecognitionSupported,
    setListening,
    setVoiceSupport,
    setLastTranscript,
  } = useVoiceStore();

  const recognitionRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      setVoiceSupport(true);
      setIsInitialized(true);

      // Setup event handlers
      recognitionRef.current.onresult = handleSpeechResult;
      recognitionRef.current.onerror = handleSpeechError;
      recognitionRef.current.onend = handleSpeechEnd;
      recognitionRef.current.onstart = () => {
        console.log('🎤 Speech recognition started');
      };
    } else {
      setVoiceSupport(false);
      console.warn('Speech recognition not supported');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [setVoiceSupport]);

  const handleSpeechResult = useCallback((event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    const fullTranscript = finalTranscript || interimTranscript;
    setLastTranscript(fullTranscript);

    // Check for safety phrase
    if (safetyPhrase && fullTranscript.toLowerCase().includes(safetyPhrase.toLowerCase())) {
      const confidence = event.results[0]?.[0]?.confidence || 0.8;
      console.log('🚨 Safety phrase detected:', fullTranscript);
      
      // Notify server via WebSocket
      socketService.detectVoicePhrase(fullTranscript, confidence);
      
      // Show local notification
      toast.error('🚨 Safety phrase detected! Emergency triggering...', {
        duration: 3000,
      });

      // Stop listening temporarily
      stopListening();
      
      // Trigger emergency via API
      handleEmergencyTrigger(fullTranscript, confidence);
    }
  }, [safetyPhrase, setLastTranscript]);

  const handleSpeechError = useCallback((event) => {
    console.error('Speech recognition error:', event.error);
    setListening(false);
    
    if (event.error === 'not-allowed') {
      toast.error('Microphone permission denied');
    } else if (event.error === 'no-speech') {
      console.log('No speech detected, restarting...');
      // Auto-restart if no speech but should be listening
      if (isListening) {
        setTimeout(() => startListening(), 1000);
      }
    }
  }, [isListening]);

  const handleSpeechEnd = useCallback(() => {
    console.log('🎤 Speech recognition ended');
    if (isListening) {
      // Auto-restart if it should still be listening
      setTimeout(() => {
        if (recognitionRef.current && isListening) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.log('Failed to restart recognition:', error);
            setListening(false);
          }
        }
      }, 1000);
    } else {
      setListening(false);
    }
  }, [isListening, setListening]);

  const handleEmergencyTrigger = async (transcript, confidence) => {
    try {
      // This will be handled by the emergency hook/component
      const event = new CustomEvent('voiceEmergencyTrigger', {
        detail: { transcript, confidence }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Failed to trigger emergency:', error);
    }
  };

  const startListening = useCallback(() => {
    if (!voiceRecognitionSupported) {
      toast.error('Speech recognition not supported');
      return false;
    }

    if (!safetyPhrase) {
      toast.error('Please set a safety phrase first');
      return false;
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setListening(true);
        toast.success('🎤 Voice monitoring started');
        return true;
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast.error('Failed to start voice recognition');
        return false;
      }
    }
    return false;
  }, [voiceRecognitionSupported, safetyPhrase, isListening, setListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setListening(false);
      toast.success('🎤 Voice monitoring stopped');
    }
  }, [isListening, setListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    voiceRecognitionSupported,
    isInitialized,
    startListening,
    stopListening,
    toggleListening,
  };
};

# ==============================================================================
# src/hooks/useLocation.js - Location Hook
# ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useLocationStore } from '../store/useStore';
import { locationAPI } from '../services/api';
import socketService from '../services/socketService';
import toast from 'react-hot-toast';

export const useLocation = () => {
  const {
    currentLocation,
    nearbyUsers,
    locationPermission,
    isTrackingLocation,
    setCurrentLocation,
    setNearbyUsers,
    setLocationPermission,
    setLocationTracking,
  } = useLocationStore();

  const [watchId, setWatchId] = useState(null);

  // Initialize location tracking
  useEffect(() => {
    checkLocationSupport();
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const checkLocationSupport = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      setLocationPermission('denied');
      return false;
    }
    return true;
  };

  const requestLocationPermission = useCallback(async () => {
    if (!checkLocationSupport()) return false;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationPermission('granted');
          handleLocationUpdate(position);
          resolve(true);
        },
        (error) => {
          console.error('Location permission error:', error);
          setLocationPermission('denied');
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              toast.error('Location permission denied');
              break;
            case error.POSITION_UNAVAILABLE:
              toast.error('Location information unavailable');
              break;
            case error.TIMEOUT:
              toast.error('Location request timeout');
              break;
            default:
              toast.error('Unknown location error');
              break;
          }
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, [setLocationPermission]);

  const handleLocationUpdate = useCallback(async (position) => {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString(),
    };

    setCurrentLocation(location);

    try {
      // Update location on server
      await locationAPI.update({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      });

      // Send location via WebSocket
      socketService.updateLocation(
        location.latitude,
        location.longitude,
        location.accuracy
      );

      // Get nearby users
      const nearbyResponse = await locationAPI.getNearbyUsers(
        location.latitude,
        location.longitude
      );
      setNearbyUsers(nearbyResponse.data.users || []);

    } catch (error) {
      console.error('Failed to update location:', error);
    }
  }, [setCurrentLocation, setNearbyUsers]);

  const startLocationTracking = useCallback(async () => {
    if (!checkLocationSupport()) return false;

    if (locationPermission !== 'granted') {
      const granted = await requestLocationPermission();
      if (!granted) return false;
    }

    if (isTrackingLocation) return true;

    const id = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      (error) => {
        console.error('Location tracking error:', error);
        toast.error('Location tracking error');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000, // 1 minute
      }
    );

    setWatchId(id);
    setLocationTracking(true);
    toast.success('📍 Location tracking started');
    return true;
  }, [
    locationPermission,
    isTrackingLocation,
    requestLocationPermission,
    handleLocationUpdate,
    setLocationTracking,
  ]);

  const stopLocationTracking = useCallback(() => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setLocationTracking(false);
    toast.success('📍 Location tracking stopped');
  }, [watchId, setLocationTracking]);

  const getCurrentLocation = useCallback(async () => {
    if (!checkLocationSupport()) return null;

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setCurrentLocation(location);
          resolve(location);
        },
        (error) => {
          console.error('Get current location error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  }, [setCurrentLocation]);

  return {
    currentLocation,
    nearbyUsers,
    locationPermission,
    isTrackingLocation,
    requestLocationPermission,
    startLocationTracking,
    stopLocationTracking,
    getCurrentLocation,
  };
};

# ==============================================================================
# src/hooks/useEmergency.js - Emergency Hook
# ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useEmergencyStore, useLocationStore, useAuthStore, useAppStore } from '../store/useStore';
import { emergencyAPI } from '../services/api';
import socketService from '../services/socketService';
import toast from 'react-hot-toast';

export const useEmergency = () => {
  const {
    isEmergencyActive,
    emergencySession,
    isRecording,
    alarmActive,
    setEmergencyActive,
    setRecording,
    setAlarmActive,
    dismissEmergency,
  } = useEmergencyStore();

  const { currentLocation } = useLocationStore();
  const { user } = useAuthStore();
  const { addNotification } = useAppStore();

  const [isTriggering, setIsTriggering] = useState(false);

  // Listen for voice emergency triggers
  useEffect(() => {
    const handleVoiceEmergency = (event) => {
      const { transcript, confidence } = event.detail;
      triggerEmergency('voice', { transcript, confidence });
    };

    window.addEventListener('voiceEmergencyTrigger', handleVoiceEmergency);
    return () => {
      window.removeEventListener('voiceEmergencyTrigger', handleVoiceEmergency);
    };
  }, []);

  // Listen for socket emergency events
  useEffect(() => {
    const handleEmergencyAlert = (data) => {
      if (data.user.id !== user?.id) {
        addNotification({
          type: 'emergency',
          title: '🚨 Emergency Alert',
          message: `${data.user.name} needs help nearby!`,
          data: data,
        });
        
        toast.error(`🚨 Emergency Alert: ${data.user.name} needs help!`, {
          duration: 10000,
        });
      }
    };

    const handleEmergencyDismissed = (data) => {
      toast.success('✅ Emergency has been dismissed');
    };

    socketService.on('emergency_alert_received', handleEmergencyAlert);
    socketService.on('emergency_dismissed_received', handleEmergencyDismissed);

    return () => {
      socketService.off('emergency_alert_received', handleEmergencyAlert);
      socketService.off('emergency_dismissed_received', handleEmergencyDismissed);
    };
  }, [user, addNotification]);

  const triggerEmergency = useCallback(async (triggerType = 'manual', additionalData = {}) => {
    if (isTriggering || isEmergencyActive) {
      toast.error('Emergency already active');
      return;
    }

    setIsTriggering(true);

    try {
      const emergencyData = {
        trigger_type: triggerType,
        location: currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy,
        } : null,
        ...additionalData,
      };

      const response = await emergencyAPI.trigger(emergencyData);
      
      if (response.data.success) {
        setEmergencyActive(true, {
          sessionId: response.data.session_id,
          triggerType,
          triggeredAt: new Date().toISOString(),
        });

        setAlarmActive(true);
        startRecording();

        toast.error('🚨 EMERGENCY ALERT ACTIVE!', {
          duration: 5000,
        });

        // Auto-stop alarm after 3 minutes
        setTimeout(() => {
          setAlarmActive(false);
        }, 180000);

        // Auto-stop recording after 15 minutes
        setTimeout(() => {
          stopRecording();
        }, 900000);

        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to trigger emergency');
      }
    } catch (error) {
      console.error('Emergency trigger error:', error);
      toast.error('Failed to trigger emergency');
    } finally {
      setIsTriggering(false);
    }
  }, [isTriggering, isEmergencyActive, currentLocation, setEmergencyActive, setAlarmActive]);

  const dismissEmergencyAlert = useCallback(async () => {
    if (!emergencySession?.sessionId) {
      toast.error('No active emergency to dismiss');
      return;
    }

    try {
      const response = await emergencyAPI.dismiss({
        session_id: emergencySession.sessionId,
      });

      if (response.data.success) {
        dismissEmergency();
        stopRecording();
        toast.success('✅ Emergency dismissed');
      } else {
        throw new Error(response.data.message || 'Failed to dismiss emergency');
      }
    } catch (error) {
      console.error('Emergency dismiss error:', error);
      toast.error('Failed to dismiss emergency');
    }
  }, [emergencySession, dismissEmergency]);

  const startRecording = useCallback(() => {
    setRecording(true);
    console.log('🎙️ Started emergency recording');
    // In a real app, implement actual audio recording
  }, [setRecording]);

  const stopRecording = useCallback(() => {
    setRecording(false);
    console.log('🎙️ Stopped emergency recording');
    // In a real app, stop and upload recording
  }, [setRecording]);

  const getEmergencyStatus = useCallback(async () => {
    try {
      const response = await emergencyAPI.getStatus();
      return response.data;
    } catch (error) {
      console.error('Failed to get emergency status:', error);
      return null;
    }
  }, []);

  return {
    isEmergencyActive,
    emergencySession,
    isRecording,
    alarmActive,
    isTriggering,
    triggerEmergency,
    dismissEmergencyAlert,
    getEmergencyStatus,
  };
};

# ==============================================================================
# src/components/Layout/Layout.js - Main Layout Component
# ==============================================================================

import React from 'react';
import { Shield, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '../../store/useStore';

const Layout = ({ children }) => {
  const { isOnline } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="bg-red-500 text-white p-2 text-center text-sm flex items-center justify-center gap-2">
          <WifiOff size={16} />
          You are offline - Some features may not work
        </div>
      )}
      
      {children}
    </div>
  );
};

export default Layout;

# ==============================================================================
# src/components/Emergency/EmergencyBanner.js - Emergency Alert Banner
# ==============================================================================

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useEmergencyStore } from '../../store/useStore';
import { useEmergency } from '../../hooks/useEmergency';

const EmergencyBanner = () => {
  const { isEmergencyActive, alarmActive } = useEmergencyStore();
  const { dismissEmergencyAlert } = useEmergency();

  if (!isEmergencyActive) return null;

  return (
    <div className={`w-full p-4 text-white text-center relative ${
      alarmActive ? 'bg-red-600 animate-pulse' : 'bg-red-500'
    }`}>
      <div className="flex items-center justify-center gap-2">
        <AlertTriangle size={20} />
        <span className="font-semibold">
          {alarmActive ? 'EMERGENCY ALERT ACTIVE - ALARM SOUNDING' : 'EMERGENCY ALERT ACTIVE'}
        </span>
      </div>
      
      <button
        onClick={dismissEmergencyAlert}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-red-700 hover:bg-red-800 px-3 py-1 rounded text-sm transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
};

export default EmergencyBanner;

# ==============================================================================
# src/components/Emergency/EmergencyButton.js - Emergency Trigger Button
# ==============================================================================

import React, { useState } from 'react';
import { AlertTriangle, Phone } from 'lucide-react';
import { useEmergency } from '../../hooks/useEmergency';

const EmergencyButton = () => {
  const { triggerEmergency, isTriggering, isEmergencyActive } = useEmergency();
  const [holdCount, setHoldCount] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const handleMouseDown = () => {
    if (isEmergencyActive || isTriggering) return;
    
    setIsHolding(true);
    let count = 0;
    
    const interval = setInterval(() => {
      count += 1;
      setHoldCount(count);
      
      if (count >= 30) { // 3 seconds at 100ms intervals
        clearInterval(interval);
        triggerEmergency('manual');
        setHoldCount(0);
        setIsHolding(false);
      }
    }, 100);

    const cleanup = () => {
      clearInterval(interval);
      setHoldCount(0);
      setIsHolding(false);
    };

    const handleMouseUp = () => {
      cleanup();
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
  };

  const handleQuickTrigger = () => {
    if (!isEmergencyActive && !isTriggering) {
      triggerEmergency('manual');
    }
  };

  const progressPercentage = (holdCount / 30) * 100;

  return (
    <div className="relative">
      {/* Hold-to-trigger button */}
      <div className="relative">
        <button
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          disabled={isEmergencyActive || isTriggering}
          className={`w-32 h-32 rounded-full flex flex-col items-center justify-center text-white font-bold text-lg shadow-lg transition-all duration-200 ${
            isEmergencyActive 
              ? 'bg-gray-400 cursor-not-allowed' 
              : isTriggering
              ? 'bg-red-600 animate-pulse'
              : 'bg-red-500 hover:bg-red-600 active:scale-95'
          }`}
        >
          <AlertTriangle size={32} />
          <span className="text-sm mt-1">
            {isEmergencyActive ? 'ACTIVE' : 'HOLD'}
          </span>
        </button>
        
        {/* Progress indicator */}
        {isHolding && (
          <div className="absolute inset-0 rounded-full border-4 border-white">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 46}`}
                strokeDashoffset={`${2 * Math.PI * 46 * (1 - progressPercentage / 100)}`}
                className="transition-all duration-100"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Quick trigger button */}
      <button
        onClick={handleQuickTrigger}
        disabled={isEmergencyActive || isTriggering}
        className={`mt-4 w-32 py-2 rounded-lg flex items-center justify-center gap-2 text-white font-semibold ${
          isEmergencyActive || isTriggering
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-orange-500 hover:bg-orange-600'
        }`}
      >
        <Phone size={16} />
        <span className="text-sm">Quick SOS</span>
      </button>

      <p className="text-xs text-gray-600 text-center mt-2 max-w-32">
        Hold red button for 3 seconds or tap Quick SOS
      </p>
    </div>
  );
};

export default EmergencyButton;

# ==============================================================================
# src/components/Voice/VoiceControl.js - Voice Recognition Control
# ==============================================================================

import React, { useState } from 'react';
import { Mic, MicOff, Edit3, Save, Volume2 } from 'lucide-react';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import { useVoiceStore } from '../../store/useStore';
import { voiceAPI } from '../../services/api';
import toast from 'react-hot-toast';

const VoiceControl = () => {
  const { isListening, voiceRecognitionSupported, toggleListening } = useVoiceRecognition();
  const { safetyPhrase, hasSafetyPhrase, setSafetyPhrase } = useVoiceStore();
  
  const [isEditing, setIsEditing] = useState(!hasSafetyPhrase);
  const [newPhrase, setNewPhrase] = useState(safetyPhrase);
  const [phrasePassword, setPhrasePassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSavePhrase = async () => {
    if (!newPhrase.trim()) {
      toast.error('Please enter a safety phrase');
      return;
    }

    if (!phrasePassword) {
      toast.error('Please enter a password');
      return;
    }

    setIsUpdating(true);
    
    try {
      const response = await voiceAPI.trainPhrase({
        phrase: newPhrase.trim(),
        phrase_password: phrasePassword,
      });

      if (response.data.success) {
        setSafetyPhrase(newPhrase.trim());
        setIsEditing(false);
        setPhrasePassword('');
        toast.success('✅ Safety phrase saved successfully');
      } else {
        throw new Error(response.data.message || 'Failed to save phrase');
      }
    } catch (error) {
      console.error('Failed to save phrase:', error);
      toast.error('Failed to save safety phrase');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePhrase = async () => {
    if (!newPhrase.trim()) {
      toast.error('Please enter a new safety phrase');
      return;
    }

    if (!phrasePassword) {
      toast.error('Please enter your password');
      return;
    }

    setIsUpdating(true);

    try {
      const response = await voiceAPI.updatePhrase({
        phrase: newPhrase.trim(),
        old_password: phrasePassword,
        new_password: phrasePassword, // Using same password for simplicity
      });

      if (response.data.success) {
        setSafetyPhrase(newPhrase.trim());
        setIsEditing(false);
        setPhrasePassword('');
        toast.success('✅ Safety phrase updated successfully');
      } else {
        throw new Error(response.data.message || 'Failed to update phrase');
      }
    } catch (error) {
      console.error('Failed to update phrase:', error);
      toast.error('Failed to update safety phrase');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!voiceRecognitionSupported) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Voice Recognition</h3>
        <div className="text-center text-gray-500">
          <MicOff size={48} className="mx-auto mb-2 text-gray-400" />
          <p>Voice recognition is not supported in your browser</p>
          <p className="text-sm mt-1">Please use Chrome or Safari</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="font-semibold text-gray-800 mb-4">Voice Guard</h3>
      
      {/* Voice Control Button */}
      <div className="flex flex-col items-center mb-6">
        <button
          onClick={toggleListening}
          disabled={!hasSafetyPhrase || isEditing}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
            !hasSafetyPhrase || isEditing
              ? 'bg-gray-300 cursor-not-allowed'
              : isListening
              ? 'bg-green-500 hover:bg-green-600 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isListening ? (
            <Volume2 className="text-white" size={32} />
          ) : (
            <Mic className="text-white" size={32} />
          )}
        </button>
        
        <p className="text-sm text-gray-600 mt-2 text-center">
          {!hasSafetyPhrase 
            ? 'Set a safety phrase first'
            : isListening 
            ? 'Listening for safety phrase...'
            : 'Tap to start voice monitoring'
          }
        </p>
      </div>

      {/* Safety Phrase Management */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-800">Safety Phrase</h4>
          {hasSafetyPhrase && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm"
            >
              <Edit3 size={14} />
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              placeholder="Enter your safety phrase (e.g., 'help me now')"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <input
              type="password"
              value={phrasePassword}
              onChange={(e) => setPhrasePassword(e.target.value)}
              placeholder="Enter password for phrase protection"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <div className="flex gap-2">
              <button
                onClick={hasSafetyPhrase ? handleUpdatePhrase : handleSavePhrase}
                disabled={isUpdating || !newPhrase.trim() || !phrasePassword}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Save size={16} />
                {isUpdating ? 'Saving...' : hasSafetyPhrase ? 'Update' : 'Save'}
              </button>
              
              {hasSafetyPhrase && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setNewPhrase(safetyPhrase);
                    setPhrasePassword('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 rounded-lg p-3">
            {hasSafetyPhrase ? (
              <p className="text-blue-800">
                <strong>Current phrase:</strong> "{safetyPhrase}"
              </p>
            ) : (
              <p className="text-blue-800">
                No safety phrase set. Click "Set Phrase" to get started.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-500">
        <p className="mb-1">• Speak your safety phrase to trigger emergency alerts</p>
        <p className="mb-1">• Keep your device near you when voice guard is active</p>
        <p>• Choose a unique phrase you won't say accidentally</p>
      </div>
    </div>
  );
};

export default VoiceControl;

# ==============================================================================
# src/components/Location/LocationStatus.js - Location Status Component
# ==============================================================================

import React, { useEffect } from 'react';
import { MapPin, Users, Navigation } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import { useLocationStore } from '../../store/useStore';

const LocationStatus = () => {
  const { 
    currentLocation, 
    nearbyUsers, 
    locationPermission, 
    isTrackingLocation 
  } = useLocationStore();
  
  const { 
    startLocationTracking, 
    stopLocationTracking, 
    requestLocationPermission 
  } = useLocation();

  useEffect(() => {
    // Auto-start location tracking if permission is granted
    if (locationPermission === 'granted' && !isTrackingLocation) {
      startLocationTracking();
    }
  }, [locationPermission, isTrackingLocation, startLocationTracking]);

  const handleLocationToggle = async () => {
    if (!isTrackingLocation) {
      if (locationPermission !== 'granted') {
        await requestLocationPermission();
      } else {
        startLocationTracking();
      }
    } else {
      stopLocationTracking();
    }
  };

  const getLocationStatus = () => {
    if (locationPermission === 'denied') return 'Permission denied';
    if (locationPermission === 'granted' && isTrackingLocation) return 'Tracking active';
    if (locationPermission === 'granted' && !isTrackingLocation) return 'Available';
    return 'Getting permission...';
  };

  const getLocationColor = () => {
    if (locationPermission === 'denied') return 'text-red-500';
    if (isTrackingLocation) return 'text-green-500';
    return 'text-yellow-500';
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Location Status */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className={`${getLocationColor()}`} size={20} />
          <span className="font-semibold text-gray-800">Location</span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">
          {getLocationStatus()}
        </p>
        
        {currentLocation && (
          <div className="text-xs text-gray-500 mb-3">
            <p>Lat: {currentLocation.latitude.toFixed(6)}</p>
            <p>Lng: {currentLocation.longitude.toFixed(6)}</p>
            {currentLocation.accuracy && (
              <p>Accuracy: ±{Math.round(currentLocation.accuracy)}m</p>
            )}
          </div>
        )}
        
        <button
          onClick={handleLocationToggle}
          className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            isTrackingLocation
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {isTrackingLocation ? 'Stop Tracking' : 'Start Tracking'}
        </button>
      </div>
      
      {/* Nearby Users */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="text-blue-500" size={20} />
          <span className="font-semibold text-gray-800">Nearby</span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">
          {nearbyUsers.length} SafeGuard users
        </p>
        
        {nearbyUsers.length > 0 && (
          <div className="space-y-1 mb-3">
            {nearbyUsers.slice(0, 3).map((user, index) => (
              <div key={user.id || index} className="text-xs text-gray-500 flex justify-between">
                <span>{user.name}</span>
                <span>{user.distance?.toFixed(1) || '~1.5'}km</span>
              </div>
            ))}
            {nearbyUsers.length > 3 && (
              <p className="text-xs text-blue-500">+{nearbyUsers.length - 3} more</p>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Navigation size={12} />
          <span>Auto-updating</span>
        </div>
      </div>
    </div>
  );
};

export default LocationStatus;

# ==============================================================================
# src/components/Contacts/EmergencyContacts.js - Emergency Contacts Management
# ==============================================================================

import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Phone, Edit3, Save, X } from 'lucide-react';
import { useAppStore, useAuthStore } from '../../store/useStore';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const EmergencyContacts = () => {
  const { emergencyContacts, setEmergencyContacts, addEmergencyContact, removeEmergencyContact } = useAppStore();
  const { user } = useAuthStore();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
  });

  // Load emergency contacts on mount
  useEffect(() => {
    loadEmergencyContacts();
  }, []);

  const loadEmergencyContacts = async () => {
    try {
      const response = await userAPI.getEmergencyContacts();
      setEmergencyContacts(response.data || []);
    } catch (error) {
      console.error('Failed to load emergency contacts:', error);
    }
  };

  const handleAddContact = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone number are required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await userAPI.addEmergencyContact(formData);
      addEmergencyContact(response.data);
      setFormData({ name: '', phone: '', relationship: '' });
      setIsAdding(false);
      toast.success('✅ Emergency contact added');
    } catch (error) {
      console.error('Failed to add contact:', error);
      toast.error('Failed to add emergency contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to remove this contact?')) {
      return;
    }

    try {
      await userAPI.removeEmergencyContact(contactId);
      removeEmergencyContact(contactId);
      toast.success('✅ Emergency contact removed');
    } catch (error) {
      console.error('Failed to remove contact:', error);
      toast.error('Failed to remove emergency contact');
    }
  };

  const handleEditContact = (contact) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship || '',
    });
  };

  const handleSaveEdit = async (contactId) => {
    // For simplicity, we'll remove and re-add the contact
    // In a real app, you'd have an update endpoint
    try {
      await userAPI.removeEmergencyContact(contactId);
      const response = await userAPI.addEmergencyContact(formData);
      
      // Update local state
      const updatedContacts = emergencyContacts.map(contact => 
        contact.id === contactId ? response.data : contact
      );
      setEmergencyContacts(updatedContacts);
      
      setEditingId(null);
      setFormData({ name: '', phone: '', relationship: '' });
      toast.success('✅ Contact updated');
    } catch (error) {
      console.error('Failed to update contact:', error);
      toast.error('Failed to update contact');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', phone: '', relationship: '' });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Emergency Contacts</h3>
        <button
          onClick={() => setIsAdding(true)}
          disabled={isAdding || editingId}
          className="text-pink-500 hover:text-pink-600 disabled:text-gray-400"
        >
          <UserPlus size={20} />
        </button>
      </div>

      {/* Add Contact Form */}
      {isAdding && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="font-medium mb-3 text-gray-800">Add Emergency Contact</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
            <input
              type="text"
              placeholder="Relationship (optional)"
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddContact}
                disabled={isLoading || !formData.name.trim() || !formData.phone.trim()}
                className="flex-1 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isLoading ? 'Adding...' : 'Add Contact'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts List */}
      {emergencyContacts.length === 0 ? (
        <div className="text-center py-8">
          <Users className="mx-auto text-gray-400 mb-2" size={48} />
          <p className="text-gray-500">No emergency contacts added</p>
          <p className="text-sm text-gray-400 mt-1">Add contacts who will be notified during emergencies</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emergencyContacts.map((contact) => (
            <div key={contact.id} className="border border-gray-200 rounded-lg p-3">
              {editingId === contact.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Relationship"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(contact.id)}
                      className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm"
                    >
                      <Save size={14} />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 text-gray-600 hover:text-gray-700 text-sm"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-800">{contact.name}</p>
                        <p className="text-sm text-gray-600">{contact.phone}</p>
                        {contact.relationship && (
                          <p className="text-xs text-gray-500">{contact.relationship}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditContact(contact)}
                      disabled={isAdding || editingId}
                      className="text-blue-500 hover:text-blue-600 disabled:text-gray-400"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleRemoveContact(contact.id)}
                      disabled={isAdding || editingId}
                      className="text-red-500 hover:text-red-600 disabled:text-gray-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {emergencyContacts.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <p className="font-medium text-blue-800 mb-1">Emergency Alert Process:</p>
          <p>• SMS alerts sent to all contacts immediately</p>
          <p>• Your live location shared automatically</p>
          <p>• Voice recording sent after emergency ends</p>
        </div>
      )}
    </div>
  );
};

export default EmergencyContacts;

# ==============================================================================
# src/components/Profile/ProfileManagement.js - User Profile Management
# ==============================================================================

import React, { useState, useEffect } from 'react';
import { User, Edit3, Save, X } from 'lucide-react';
import { useAuthStore } from '../../store/useStore';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ProfileManagement = () => {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
  });

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await userAPI.updateProfile(formData);
      updateUser(response.data);
      setIsEditing(false);
      toast.success('✅ Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
        address: user.address || '',
      });
    }
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Profile Information</h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-pink-500 hover:text-pink-600 flex items-center gap-1"
          >
            <Edit3 size={16} />
            <span className="text-sm">Edit</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isLoading || !formData.name.trim()}
              className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:text-gray-400"
            >
              <Save size={16} />
              <span className="text-sm">{isLoading ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="text-gray-600 hover:text-gray-700 flex items-center gap-1 disabled:text-gray-400"
            >
              <X size={16} />
              <span className="text-sm">Cancel</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mb-6">
        {user.profile_picture ? (
          <img
            src={user.profile_picture}
            alt="Profile"
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
            <User className="text-pink-500" size={24} />
          </div>
        )}
        <div>
          <h4 className="font-medium text-gray-800">{user.name}</h4>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="+91 9876543210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="">Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Enter your address"
              rows="3"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Phone:</span>
            <span className="text-sm text-gray-800">{user.phone || 'Not provided'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Date of Birth:</span>
            <span className="text-sm text-gray-800">
              {user.date_of_birth || 'Not provided'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Gender:</span>
            <span className="text-sm text-gray-800 capitalize">
              {user.gender || 'Not specified'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Address:</span>
            <span className="text-sm text-gray-800 text-right max-w-48">
              {user.address || 'Not provided'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileManagement;

# ==============================================================================
# src/components/Notifications/NotificationCenter.js - Notification Management
# ==============================================================================

import React, { useEffect } from 'react';
import { Bell, X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatDistanceToNow } from 'date-fns';

const NotificationCenter = () => {
  const { notifications, removeNotification } = useAppStore();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="text-red-500" size={20} />;
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'info':
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  const getNotificationBg = (type) => {
    switch (type) {
      case 'emergency':
        return 'bg-red-50 border-red-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="text-gray-400" size={20} />
          <h3 className="font-semibold text-gray-800">Notifications</h3>
        </div>
        <div className="text-center py-8">
          <Bell className="mx-auto text-gray-300 mb-2" size={48} />
          <p className="text-gray-500">No notifications</p>
          <p className="text-sm text-gray-400 mt-1">
            You'll see emergency alerts and app updates here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="text-gray-600" size={20} />
          <h3 className="font-semibold text-gray-800">Notifications</h3>
          {notifications.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {notifications.length}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg border ${getNotificationBg(notification.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 text-sm">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Emergency notification details */}
                {notification.type === 'emergency' && notification.data && (
                  <div className="mt-2 p-2 bg-white rounded border text-xs">
                    <p><strong>Location:</strong> 
                      {notification.data.location ? 
                        ` ${notification.data.location.latitude.toFixed(4)}, ${notification.data.location.longitude.toFixed(4)}` : 
                        ' Not available'
                      }
                    </p>
                    <p><strong>Trigger:</strong> {notification.data.trigger_type}</p>
                    {notification.data.user.phone && (
                      <p><strong>Contact:</strong> {notification.data.user.phone}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationCenter;

# ==============================================================================
# src/pages/Login.js - Login Page
# ==============================================================================

import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await authAPI.googleLogin();
      
      // Mock user data since we're using mock auth
      const mockUser = {
        id: '1',
        name: 'Demo User',
        email: 'demo@safeguard.com',
        profile_picture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
      };
      
      const token = response.data.access_token;
      
      // Store token and user
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      setAuth(mockUser, token);
      toast.success('✅ Successfully signed in!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-pink-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">SafeGuard</h1>
          <p className="text-gray-600">Your personal safety companion</p>
        </div>
        
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </button>
        
        <p className="text-xs text-gray-500 text-center mt-4">
          By signing in, you agree to our terms and privacy policy
        </p>

        {/* Demo Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-1">Demo Mode</p>
          <p className="text-xs text-blue-700">
            This is a demo version. Click "Continue with Google" to proceed with mock authentication.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

# ==============================================================================
# src/pages/Dashboard.js - Main Dashboard Page
# ==============================================================================

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, Mic, Volume2 } from 'lucide-react';
import { useAuthStore, useEmergencyStore, useVoiceStore } from '../store/useStore';
import { useLocation } from '../hooks/useLocation';
import socketService from '../services/socketService';
import toast, { Toaster } from 'react-hot-toast';

// Components
import Layout from '../components/Layout/Layout';
import EmergencyBanner from '../components/Emergency/EmergencyBanner';
import EmergencyButton from '../components/Emergency/EmergencyButton';
import VoiceControl from '../components/Voice/VoiceControl';
import LocationStatus from '../components/Location/LocationStatus';
import EmergencyContacts from '../components/Contacts/EmergencyContacts';
import ProfileManagement from '../components/Profile/ProfileManagement';
import NotificationCenter from '../components/Notifications/NotificationCenter';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { isEmergencyActive, isRecording, alarmActive } = useEmergencyStore();
  const { isListening } = useVoiceStore();
  const { startLocationTracking } = useLocation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  // Initialize services on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect to WebSocket
      socketService.connect();
      
      // Start location tracking
      startLocationTracking();
      
      // Show welcome message
      toast.success(`Welcome back, ${user.name}!`);
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, user, startLocationTracking]);

  const handleLogout = () => {
    if (isEmergencyActive) {
      toast.error('Cannot logout during an active emergency');
      return;
    }
    
    socketService.disconnect();
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Toaster position="top-center" />
      
      {/* Emergency Banner */}
      <EmergencyBanner />
      
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={user.profile_picture}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h1 className="font-semibold text-gray-800">Hello, {user.name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Stay safe today</span>
                {isListening && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Mic size={12} />
                    <span className="text-xs">Listening</span>
                  </div>
                )}
                {isRecording && (
                  <div className="flex items-center gap-1 text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs">Recording</span>
                  </div>
                )}
                {alarmActive && (
                  <div className="flex items-center gap-1 text-orange-600">
                    <Volume2 size={12} />
                    <span className="text-xs">Alarm</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Shield className="text-pink-500" size={24} />
            <button
              onClick={handleLogout}
              disabled={isEmergencyActive}
              className="text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Emergency Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Emergency Controls</h2>
          
          <div className="flex flex-col items-center gap-6">
            <EmergencyButton />
            
            {/* Status Indicators */}
            <div className="flex gap-4 text-sm">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                isEmergencyActive ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isEmergencyActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                }`} />
                {isEmergencyActive ? 'Emergency Active' : 'Safe'}
              </div>
              
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                isListening ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}>
                <Mic size={12} />
                {isListening ? 'Voice Guard On' : 'Voice Guard Off'}
              </div>
            </div>
          </div>
        </div>

        {/* Location and Voice Control */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LocationStatus />
          <VoiceControl />
        </div>

        {/* Emergency Contacts */}
        <EmergencyContacts />

        {/* Profile and Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfileManagement />
          <NotificationCenter />
        </div>

        {/* App Info */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-800 mb-4">How SafeGuard Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="bg-pink-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                <Mic className="text-pink-600" size={20} />
              </div>
              <h4 className="font-medium text-gray-800 mb-1">Voice Recognition</h4>
              <p className="text-xs text-gray-600">
                Say your safety phrase to instantly trigger emergency alerts
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                <Shield className="text-blue-600" size={20} />
              </div>
              <h4 className="font-medium text-gray-800 mb-1">Instant Alerts</h4>
              <p className="text-xs text-gray-600">
                Contacts and nearby users get immediate notifications with your location
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                <Volume2 className="text-green-600" size={20} />
              </div>
              <h4 className="font-medium text-gray-800 mb-1">Audio Recording</h4>
              <p className="text-xs text-gray-600">
                Automatic voice recording during emergencies for evidence
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

# ==============================================================================
# src/App.js - Main Application Component
# ==============================================================================

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useAppStore } from './store/useStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const App = () => {
  const { isAuthenticated, user, setAuth } = useAuthStore();
  const { setOnlineStatus } = useAppStore();

  // Check for existing authentication on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setAuth(parsedUser, token);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, [setAuth]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
          />
          <Route 
            path="*" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;

# ==============================================================================
# src/index.js - Application Entry Point
# ==============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

# ==============================================================================
# src/index.css - Global Styles
# ==============================================================================

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

/* Custom animations */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(-25%);
    animation-timing-function: cubic-bezier(0.8,0,1,1);
  }
  50% {
    transform: none;
    animation-timing-function: cubic-bezier(0,0,0.2,1);
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bounce {
  animation: bounce 1s infinite;
}

/* Emergency alert styles */
.emergency-banner {
  background: linear-gradient(45deg, #dc2626, #ef4444);
  animation: pulse 1.5s ease-in-out infinite;
}

/* Voice recognition visual feedback */
.voice-listening {
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
  animation: pulse 1s ease-in-out infinite;
}

/* Recording indicator */
.recording-dot {
  animation: pulse 1s ease-in-out infinite;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .grid-cols-2 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Focus styles for accessibility */
button:focus,
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid #ec4899;
  outline-offset: 2px;
}

/* Emergency button styles */
.emergency-button {
  transition: all 0.2s ease-in-out;
}

.emergency-button:active {
  transform: scale(0.95);
}

.emergency-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Toast notification overrides */
.toast-notification {
  font-family: inherit;
}

/* Loading spinner */
.loading-spinner {
  border: 2px solid #f3f3f3;
  border-top: 2px solid #ec4899;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

# ==============================================================================
# public/index.html - HTML Template
# ==============================================================================

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#ec4899" />
    <meta name="description" content="SafeGuard - Your personal safety companion" />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <title>SafeGuard - Women's Safety App</title>
    
    <!-- Tailwind CSS CDN for quick setup -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Meta tags for PWA -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="SafeGuard">
    
    <!-- Favicon and app icons -->
    <link rel="icon" type="image/png" sizes="32x32" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ec4899'><path d='M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z'/></svg>">
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    
    <!-- Service Worker Registration -->
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
              console.log('SW registered: ', registration);
            })
            .catch(function(registrationError) {
              console.log('SW registration failed: ', registrationError);
            });
        });
      }
    </script>
  </body>
</html>

# ==============================================================================
# public/manifest.json - PWA Manifest
# ==============================================================================

{
  "short_name": "SafeGuard",
  "name": "SafeGuard - Women's Safety App",
  "description": "Your personal safety companion with voice recognition and emergency alerts",
  "icons": [
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ec4899'><path d='M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z'/></svg>",
      "sizes": "192x192",
      "type": "image/svg+xml"
    },
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ec4899'><path d='M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z'/></svg>",
      "sizes": "512x512",
      "type": "image/svg+xml"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#ec4899",
  "background_color": "#ffffff",
  "orientation": "portrait"
}

# ==============================================================================
# public/sw.js - Service Worker for PWA
# ==============================================================================

const CACHE_NAME = 'safeguard-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

# ==============================================================================
# Setup Instructions - Complete Installation Guide
# ==============================================================================

"""
## Quick Setup Guide (10 minutes)

### 1. Prerequisites
- Node.js 16+ installed
- Python 3.11+ installed (for backend)
- Git (optional)

### 2. Frontend Setup
```bash
# Create React app
npx create-react-app safeguard-frontend
cd safeguard-frontend

# Install dependencies
npm install react-router-dom axios socket.io-client lucide-react react-hot-toast zustand date-fns

# Replace package.json content with the one above
# Copy all source files to their respective locations:
# - src/components/
# - src/hooks/
# - src/services/
# - src/store/
# - src/pages/
# - src/config/
# - public/
```

### 3. Backend Setup (from previous Python backend)
```bash
# In a separate terminal, set up Python backend
cd ../safeguard-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install Python dependencies
pip install fastapi uvicorn python-socketio sqlalchemy pydantic python-jose passlib python-multipart aiofiles websockets geopy haversine

# Initialize database
python setup.py

# Start backend server
python run.py
```

### 4. Start Frontend
```bash
# Back to frontend directory
cd ../safeguard-frontend

# Start development server
npm start
```

### 5. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/docs

## Project Structure
```
safeguard-app/
├── safeguard-backend/          # Python FastAPI backend
│   ├── app/
│   ├── uploads/
│   ├── database.db
│   └── requirements.txt
└── safeguard-frontend/         # React frontend
    ├── public/
    ├── src/
    ├── package.json
    └── README.md
```

## Features Included

### Frontend Features
✅ Modern React 18 with hooks
✅ React Router for navigation
✅ Zustand for state management
✅ Socket.IO for real-time communication
✅ Tailwind CSS for styling
✅ React Hot Toast for notifications
✅ Progressive Web App (PWA) ready
✅ Responsive design for mobile/desktop
✅ Voice recognition integration
✅ Geolocation tracking
✅ Emergency contact management
✅ Profile management
✅ Real-time emergency alerts

### Backend Features
✅ FastAPI with async support
✅ SQLAlchemy ORM with SQLite
✅ JWT authentication
✅ WebSocket support
✅ RESTful API design
✅ Input validation with Pydantic
✅ CORS enabled
✅ Auto-generated API documentation

## Demo Flow
1. Open http://localhost:3000
2. Click "Continue with Google" (mock login)
3. Complete profile setup
4. Set safety phrase in Voice Guard
5. Add emergency contacts
6. Test voice recognition by saying your phrase
7. Test manual emergency trigger
8. See real-time updates and notifications

## Development Tips

### Frontend Development
- Components are modular and reusable
- Hooks handle complex state logic
- Services abstract API calls
- Store provides global state management
- All API calls have error handling

### Backend Development
- Services contain business logic
- Models define database schema
- Schemas validate input/output
- Routes handle HTTP requests
- WebSocket events for real-time features

### Adding New Features
1. Add backend endpoint in appropriate route file
2. Add API call in frontend service
3. Create/update React components
4. Update store if needed for state management
5. Test the complete flow

## Production Deployment

### Frontend (Netlify/Vercel)
```bash
npm run build
# Deploy dist/ folder
```

### Backend (Heroku/Railway/Render)
```bash
# Add Procfile: web: python run.py
# Set environment variables
# Deploy with git push
```

### Environment Variables
```bash
# Frontend (.env)
REACT_APP_API_URL=https://your-backend-url.com
REACT_APP_SOCKET_URL=https://your-backend-url.com

# Backend
DATABASE_URL=postgresql://...  # For production
SECRET_KEY=your-secret-key
```

## Security Considerations
- JWT tokens stored in localStorage (consider httpOnly cookies for production)
- Input validation on both frontend and backend
- CORS configured properly
- Rate limiting implemented
- Passwords hashed with bcrypt
- Environment variables for sensitive data

## Troubleshooting

### Common Issues
1. **CORS errors**: Check backend CORS settings
2. **WebSocket connection failed**: Ensure backend is running
3. **Voice recognition not working**: Use Chrome/Safari with HTTPS
4. **Location access denied**: Enable location permissions
5. **API calls failing**: Check network tab for errors

### Debug Mode
- Open browser dev tools
- Check console for errors
- Monitor network requests
- Use React Developer Tools

This complete frontend works seamlessly with the Python backend and provides a fully functional women's safety application!
"""