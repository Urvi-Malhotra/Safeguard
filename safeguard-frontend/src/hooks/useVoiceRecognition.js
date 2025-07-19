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