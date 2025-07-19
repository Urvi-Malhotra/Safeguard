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