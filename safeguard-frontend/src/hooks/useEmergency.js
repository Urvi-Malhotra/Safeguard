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
      console.log('Voice emergency triggered:', transcript, confidence);
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
      console.log('Emergency alert received:', data);
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
      console.log('Emergency dismissed:', data);
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

    console.log('Triggering emergency:', triggerType, additionalData);
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

      console.log('Emergency data being sent:', emergencyData);

      // Handle demo mode differently
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        // Demo mode - simulate emergency trigger
        const mockResponse = {
          success: true,
          session_id: 'demo-session-' + Date.now(),
          message: 'Demo emergency triggered successfully',
          contacts_notified: 2,
          nearby_users_notified: 1,
          location_url: currentLocation ? 
            `https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}` : null
        };

        setEmergencyActive(true, {
          sessionId: mockResponse.session_id,
          triggerType,
          triggeredAt: new Date().toISOString(),
        });

        setAlarmActive(true);
        startRecording();

        toast.error('🚨 DEMO EMERGENCY ALERT ACTIVE!', {
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

        return mockResponse;
      }

      // Real backend call
      const response = await emergencyAPI.trigger(emergencyData);
      console.log('Emergency API response:', response.data);
      
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

        // Show success details
        toast.success(`Emergency contacts notified: ${response.data.contacts_notified}`, {
          duration: 3000,
        });

        if (response.data.nearby_users_notified > 0) {
          toast.success(`Nearby users alerted: ${response.data.nearby_users_notified}`, {
            duration: 3000,
          });
        }

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
      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(`Failed to trigger emergency: ${error.response.data.detail || error.message}`);
      } else {
        toast.error('Failed to trigger emergency - Please check your connection');
      }
    } finally {
      setIsTriggering(false);
    }
  }, [isTriggering, isEmergencyActive, currentLocation, setEmergencyActive, setAlarmActive]);

  const dismissEmergencyAlert = useCallback(async () => {
    if (!emergencySession?.sessionId) {
      toast.error('No active emergency to dismiss');
      return;
    }

    console.log('Dismissing emergency:', emergencySession.sessionId);

    try {
      // Handle demo mode
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        dismissEmergency();
        stopRecording();
        toast.success('✅ Demo emergency dismissed');
        return;
      }

      // Real backend call
      const response = await emergencyAPI.dismiss(emergencySession.sessionId);
      console.log('Dismiss API response:', response.data);

      if (response.data.success) {
        dismissEmergency();
        stopRecording();
        toast.success('✅ Emergency dismissed');
      } else {
        throw new Error(response.data.message || 'Failed to dismiss emergency');
      }
    } catch (error) {
      console.error('Emergency dismiss error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(`Failed to dismiss emergency: ${error.response.data.detail || error.message}`);
      } else {
        toast.error('Failed to dismiss emergency - Please check your connection');
      }
    }
  }, [emergencySession, dismissEmergency]);

  const startRecording = useCallback(() => {
    setRecording(true);
    console.log('🎙️ Started emergency recording');
    
    // Start actual audio recording
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const mediaRecorder = new MediaRecorder(stream);
          const audioChunks = [];

          mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
          };

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = audioUrl;
            a.download = `emergency-recording-${new Date().toISOString()}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(audioUrl);
            stream.getTracks().forEach(track => track.stop());
            
            toast.success('Emergency recording saved');
          };

          mediaRecorder.start();
          
          // Stop recording after 15 minutes
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, 15 * 60 * 1000);
          
        })
        .catch(error => {
          console.error('Failed to start recording:', error);
          toast.error('Failed to start emergency recording');
        });
    }
  }, [setRecording]);

  const stopRecording = useCallback(() => {
    setRecording(false);
    console.log('🎙️ Stopped emergency recording');
  }, [setRecording]);

  const getEmergencyStatus = useCallback(async () => {
    try {
      // Handle demo mode
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        return { active: false };
      }

      const response = await emergencyAPI.getStatus();
      console.log('Emergency status:', response.data);
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


