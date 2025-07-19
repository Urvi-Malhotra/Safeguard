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