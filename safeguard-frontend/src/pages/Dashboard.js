import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, Mic, Volume2, MapPin, Users, Phone, Settings } from 'lucide-react';
import { useAuthStore, useEmergencyStore, useVoiceStore, useLocationStore, useAppStore } from '../store/useStore';
import { useLocation } from '../hooks/useLocation';
import { useEmergency } from '../hooks/useEmergency';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { userAPI, emergencyAPI, voiceAPI } from '../services/api';
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
  const { isListening, safetyPhrase, hasSafetyPhrase } = useVoiceStore();
  const { currentLocation, isTrackingLocation, locationPermission } = useLocationStore();
  const { emergencyContacts, notifications } = useAppStore();

  const { startLocationTracking, getCurrentLocation } = useLocation();
  const { getEmergencyStatus } = useEmergency();
  const { startListening, stopListening, voiceRecognitionSupported } = useVoiceRecognition();

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    emergencyContacts: 0,
    voicePhaseSet: false,
    locationEnabled: false,
    lastEmergency: null
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  // Initialize dashboard on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeDashboard();
    }
  }, [isAuthenticated, user]);

  const initializeDashboard = async () => {
    console.log('Initializing dashboard for user:', user);
    setIsLoading(true);

    try {
      // Initialize services
      await Promise.all([
        initializeSocketConnection(),
        loadUserProfile(),
        initializeLocationServices(),
        loadEmergencyStatus(),
        loadVoiceStatus(),
        loadEmergencyContacts()
      ]);

      // Show welcome message
      toast.success(`Welcome back, ${user.name}!`, {
        duration: 3000,
        icon: '👋'
      });

    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      toast.error('Some features may not work properly');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSocketConnection = async () => {
    try {
      console.log('Connecting to WebSocket...');
      const socket = socketService.connect();
      
      if (socket) {
        console.log('WebSocket connection initiated');
        // Socket will authenticate automatically via the service
      }
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      // Skip API call for demo mode
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        console.log('Demo mode: Using local user data');
        return;
      }

      console.log('Loading user profile...');
      const response = await userAPI.getProfile();
      console.log('Profile loaded:', response.data);
      
      // Update user data if needed
      const updatedUser = { ...user, ...response.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const initializeLocationServices = async () => {
    try {
      console.log('Initializing location services...');
      
      // Request location permission if not already granted
      if (locationPermission !== 'granted') {
        const granted = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => resolve(false),
            { timeout: 5000 }
          );
        });
        
        if (granted) {
          console.log('Location permission granted');
        } else {
          console.log('Location permission denied');
          toast.error('Location access is required for emergency features');
        }
      }

      // Start location tracking
      if (!isTrackingLocation) {
        await startLocationTracking();
      }

    } catch (error) {
      console.error('Location initialization failed:', error);
    }
  };

  const loadEmergencyStatus = async () => {
    try {
      console.log('Checking emergency status...');
      const status = await getEmergencyStatus();
      
      if (status && status.active) {
        console.log('Active emergency found:', status);
        toast.error('You have an active emergency alert!', {
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Failed to load emergency status:', error);
    }
  };

  const loadVoiceStatus = async () => {
    try {
      console.log('Loading voice status...');
      
      // Demo mode uses localStorage
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        const demoPhrase = localStorage.getItem('demo_safety_phrase');
        setDashboardStats(prev => ({
          ...prev,
          voicePhaseSet: !!demoPhrase
        }));
        return;
      }

      // Real backend call
      const response = await voiceAPI.getStatus();
      console.log('Voice status:', response.data);
      
      setDashboardStats(prev => ({
        ...prev,
        voicePhaseSet: response.data.has_phrase
      }));

    } catch (error) {
      console.error('Failed to load voice status:', error);
    }
  };

  const loadEmergencyContacts = async () => {
    try {
      console.log('Loading emergency contacts...');
      
      // Demo mode uses localStorage
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        const demoContacts = JSON.parse(localStorage.getItem('demo_emergency_contacts') || '[]');
        setDashboardStats(prev => ({
          ...prev,
          emergencyContacts: demoContacts.length
        }));
        return;
      }

      // Real backend call
      const response = await userAPI.getEmergencyContacts();
      console.log('Emergency contacts:', response.data);
      
      setDashboardStats(prev => ({
        ...prev,
        emergencyContacts: response.data?.length || 0
      }));

    } catch (error) {
      console.error('Failed to load emergency contacts:', error);
    }
  };

  const handleLogout = () => {
    if (isEmergencyActive) {
      toast.error('Cannot logout during an active emergency');
      return;
    }
    
    console.log('Logging out user');
    
    // Stop all services
    if (isListening) {
      stopListening();
    }
    
    socketService.disconnect();
    logout();
    
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleQuickActions = {
    toggleVoiceMonitoring: () => {
      console.log('Toggle voice monitoring clicked');
      if (!hasSafetyPhrase) {
        toast.error('Please set a safety phrase first');
        return;
      }
      
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    },

    refreshLocation: async () => {
      console.log('Refresh location clicked');
      try {
        const location = await getCurrentLocation();
        if (location) {
          toast.success('Location updated successfully');
        }
      } catch (error) {
        toast.error('Failed to get current location');
      }
    },

    showEmergencyHelp: () => {
      toast('🆘 Emergency Help:\n• Hold SOS button for 3 seconds\n• Say your safety phrase\n• Tap Quick SOS for immediate help', {
        duration: 8000,
        icon: '💡'
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Loading your safety dashboard...</p>
            <p className="text-gray-500 text-sm mt-2">Initializing emergency services</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return null; // Will redirect via useEffect
  }

  return (
    <Layout>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      
      {/* Emergency Banner */}
      <EmergencyBanner />
      
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ec4899&color=fff`}
              alt="Profile"
              className="w-12 h-12 rounded-full object-cover border-2 border-pink-200"
            />
            <div>
              <h1 className="text-lg font-semibold text-gray-800">Hello, {user.name}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span>Stay safe today</span>
                
                {/* Status Indicators */}
                {isListening && (
                  <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <Mic size={12} />
                    <span className="text-xs font-medium">Listening</span>
                  </div>
                )}
                
                {isRecording && (
                  <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium">Recording</span>
                  </div>
                )}
                
                {alarmActive && (
                  <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                    <Volume2 size={12} />
                    <span className="text-xs font-medium">Alarm</span>
                  </div>
                )}

                {isTrackingLocation && (
                  <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    <MapPin size={12} />
                    <span className="text-xs font-medium">Tracking</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Quick Actions */}
            <button
              onClick={handleQuickActions.toggleVoiceMonitoring}
              disabled={!voiceRecognitionSupported || !hasSafetyPhrase}
              className={`p-2 rounded-lg transition-colors ${
                isListening 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${(!voiceRecognitionSupported || !hasSafetyPhrase) ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isListening ? 'Stop voice monitoring' : 'Start voice monitoring'}
            >
              <Mic size={18} />
            </button>

            <button
              onClick={handleQuickActions.refreshLocation}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Refresh location"
            >
              <MapPin size={18} />
            </button>

            <button
              onClick={handleQuickActions.showEmergencyHelp}
              className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
              title="Emergency help"
            >
              <Settings size={18} />
            </button>

            <Shield className="text-pink-500" size={24} />
            
            <button
              onClick={handleLogout}
              disabled={isEmergencyActive}
              className="text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              title={isEmergencyActive ? 'Cannot logout during emergency' : 'Logout'}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <Phone className="text-pink-500 mx-auto mb-1" size={20} />
            <p className="text-lg font-semibold text-gray-800">{dashboardStats.emergencyContacts}</p>
            <p className="text-xs text-gray-600">Emergency Contacts</p>
          </div>
          
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <Mic className={`mx-auto mb-1 ${dashboardStats.voicePhaseSet ? 'text-green-500' : 'text-gray-400'}`} size={20} />
            <p className="text-lg font-semibold text-gray-800">{dashboardStats.voicePhaseSet ? 'SET' : 'NOT SET'}</p>
            <p className="text-xs text-gray-600">Voice Phrase</p>
          </div>
          
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <MapPin className={`mx-auto mb-1 ${isTrackingLocation ? 'text-green-500' : 'text-gray-400'}`} size={20} />
            <p className="text-lg font-semibold text-gray-800">{isTrackingLocation ? 'ACTIVE' : 'INACTIVE'}</p>
            <p className="text-xs text-gray-600">Location</p>
          </div>
          
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <Shield className={`mx-auto mb-1 ${isEmergencyActive ? 'text-red-500' : 'text-green-500'}`} size={20} />
            <p className="text-lg font-semibold text-gray-800">{isEmergencyActive ? 'ALERT' : 'SAFE'}</p>
            <p className="text-xs text-gray-600">Status</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Emergency Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Emergency Controls</h2>
            {localStorage.getItem('token') === 'demo-token-for-testing' && (
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                Demo Mode
              </span>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <EmergencyButton />
            
            {/* Status Indicators */}
            <div className="flex flex-wrap gap-3 text-sm justify-center">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
                isEmergencyActive ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isEmergencyActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                }`} />
                {isEmergencyActive ? 'Emergency Active' : 'Safe'}
              </div>
              
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
                isListening ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}>
                <Mic size={12} />
                {isListening ? 'Voice Guard On' : 'Voice Guard Off'}
              </div>

              {currentLocation && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-purple-100 text-purple-800">
                  <MapPin size={12} />
                  Location Active
                </div>
              )}
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
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <div className="bg-pink-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mic className="text-pink-600" size={20} />
              </div>
              <h4 className="font-medium text-gray-800 mb-2">Voice Recognition</h4>
              <p className="text-xs text-gray-600">
                Say your safety phrase to instantly trigger emergency alerts to all your contacts
              </p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="text-blue-600" size={20} />
              </div>
              <h4 className="font-medium text-gray-800 mb-2">Instant Alerts</h4>
              <p className="text-xs text-gray-600">
                Contacts and nearby users get immediate SMS and push notifications with your location
              </p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Volume2 className="text-green-600" size={20} />
              </div>
              <h4 className="font-medium text-gray-800 mb-2">Audio Recording</h4>
              <p className="text-xs text-gray-600">
                Automatic 15-minute voice recording during emergencies for evidence and safety
              </p>
            </div>
          </div>
        </div>

        {/* Setup Reminders */}
        {(!hasSafetyPhrase || dashboardStats.emergencyContacts === 0 || !isTrackingLocation) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="font-semibold text-yellow-800 mb-3">⚠️ Complete Your Safety Setup</h3>
            <div className="space-y-2 text-sm">
              {!hasSafetyPhrase && (
                <p className="text-yellow-700">• Set up your voice safety phrase for hands-free emergency activation</p>
              )}
              {dashboardStats.emergencyContacts === 0 && (
                <p className="text-yellow-700">• Add emergency contacts who will be notified during alerts</p>
              )}
              {!isTrackingLocation && (
                <p className="text-yellow-700">• Enable location tracking for accurate emergency location sharing</p>
              )}
            </div>
            <p className="text-yellow-600 text-xs mt-3 font-medium">
              Complete these steps to ensure maximum safety protection.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;


