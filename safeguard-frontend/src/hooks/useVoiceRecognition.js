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
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  // Initialize speech recognition
  useEffect(() => {
    initializeSpeechRecognition();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const initializeSpeechRecognition = () => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      setVoiceSupport(false);
      toast.error('Speech recognition not supported in this browser. Please use Chrome or Safari.');
      return;
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 3;

      setVoiceSupport(true);
      setIsInitialized(true);

      // Setup event handlers
      recognitionRef.current.onstart = () => {
        console.log('🎤 Speech recognition started');
        setListening(true);
      };

      recognitionRef.current.onresult = handleSpeechResult;
      recognitionRef.current.onerror = handleSpeechError;
      recognitionRef.current.onend = handleSpeechEnd;

    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      setVoiceSupport(false);
      toast.error('Failed to initialize speech recognition');
    }
  };

  const handleSpeechResult = useCallback((event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      
      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    const fullTranscript = finalTranscript || interimTranscript;
    setLastTranscript(fullTranscript);

    console.log('🎤 Transcript:', fullTranscript);

    // Check for safety phrase with improved matching
    if (safetyPhrase && fullTranscript) {
      const confidence = event.results[0]?.[0]?.confidence || 0.8;
      const isMatch = checkPhraseMatch(fullTranscript, safetyPhrase, confidence);
      
      if (isMatch) {
        console.log('🚨 Safety phrase detected:', fullTranscript);
        
        // Stop listening to prevent multiple triggers
        stopListening();
        
        // Notify server via WebSocket
        socketService.detectVoicePhrase(fullTranscript, confidence);
        
        // Show local notification
        toast.error('🚨 Safety phrase detected! Emergency triggering...', {
          duration: 3000,
        });

        // Trigger emergency
        handleEmergencyTrigger(fullTranscript, confidence);
      }
    }
  }, [safetyPhrase, setLastTranscript]);

  const checkPhraseMatch = (transcript, phrase, confidence) => {
    const spokenLower = transcript.toLowerCase().trim();
    const phraseLower = phrase.toLowerCase().trim();
    
    // Multiple matching strategies
    const strategies = [
      // Exact match
      spokenLower === phraseLower,
      
      // Contains match
      spokenLower.includes(phraseLower),
      
      // Word-by-word match (allows for small variations)
      checkWordMatch(spokenLower, phraseLower),
      
      // Fuzzy match for pronunciation variations
      checkFuzzyMatch(spokenLower, phraseLower)
    ];
    
    return strategies.some(match => match) && confidence >= 0.6;
  };

  const checkWordMatch = (spoken, phrase) => {
    const spokenWords = spoken.split(' ').filter(w => w.length > 0);
    const phraseWords = phrase.split(' ').filter(w => w.length > 0);
    
    if (phraseWords.length === 0) return false;
    
    let matchCount = 0;
    phraseWords.forEach(phraseWord => {
      if (spokenWords.some(spokenWord => 
        spokenWord.includes(phraseWord) || phraseWord.includes(spokenWord)
      )) {
        matchCount++;
      }
    });
    
    return matchCount / phraseWords.length >= 0.7; // 70% word match
  };

  const checkFuzzyMatch = (spoken, phrase) => {
    // Simple Levenshtein distance for fuzzy matching
    const distance = getLevenshteinDistance(spoken, phrase);
    const maxLength = Math.max(spoken.length, phrase.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity >= 0.75; // 75% similarity
  };

  const getLevenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const handleSpeechError = useCallback((event) => {
    console.error('Speech recognition error:', event.error);
    
    switch (event.error) {
      case 'not-allowed':
        toast.error('Microphone permission denied. Please enable microphone access.');
        setListening(false);
        break;
      case 'no-speech':
        console.log('No speech detected, continuing...');
        // Don't show error for no-speech, just continue
        break;
      case 'network':
        toast.error('Network error during speech recognition');
        setListening(false);
        break;
      case 'service-not-allowed':
        toast.error('Speech recognition service not available');
        setListening(false);
        break;
      default:
        console.log('Speech recognition error:', event.error);
        if (isListening) {
          // Try to restart after a brief delay
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
      // Start audio recording for evidence
      await startEmergencyRecording();
      
      // Trigger emergency via custom event
      const event = new CustomEvent('voiceEmergencyTrigger', {
        detail: { transcript, confidence }
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('Failed to trigger emergency:', error);
      toast.error('Failed to trigger emergency response');
    }
  };

  const startEmergencyRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        saveEmergencyRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      
      // Stop recording after 15 minutes
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 15 * 60 * 1000);
      
      console.log('🎙️ Emergency recording started');
      
    } catch (error) {
      console.error('Failed to start emergency recording:', error);
    }
  };

  const saveEmergencyRecording = (audioBlob) => {
    // Create download link for the recording
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emergency-recording-${new Date().toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('🎙️ Emergency recording saved');
    toast.success('Emergency recording saved to downloads');
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      toast.error('Microphone permission is required for voice recognition');
      return false;
    }
  };

  const startListening = useCallback(async () => {
    if (!voiceRecognitionSupported) {
      toast.error('Speech recognition not supported');
      return false;
    }

    if (!safetyPhrase) {
      toast.error('Please set a safety phrase first');
      return false;
    }

    // Request microphone permission
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      return false;
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        toast.success('🎤 Voice monitoring started');
        return true;
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast.error('Failed to start voice recognition. Please try again.');
        return false;
      }
    }
    return false;
  }, [voiceRecognitionSupported, safetyPhrase, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setListening(false);
      
      // Stop emergency recording if active
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      
      toast.success('🎤 Voice monitoring stopped');
    }
  }, [isListening, setListening, mediaRecorder]);

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

