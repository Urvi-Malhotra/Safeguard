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