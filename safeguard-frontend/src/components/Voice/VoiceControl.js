import React, { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);

  // Load voice status on component mount
  useEffect(() => {
    loadVoiceStatus();
  }, []);

  const loadVoiceStatus = async () => {
    try {
      setIsLoading(true);
      
      // Handle demo mode
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        // Demo mode - use local storage
        const demoPhrase = localStorage.getItem('demo_safety_phrase') || '';
        setSafetyPhrase(demoPhrase);
        setNewPhrase(demoPhrase);
        setIsEditing(!demoPhrase);
        setIsLoading(false);
        return;
      }

      // Real backend call
      const response = await voiceAPI.getStatus();
      console.log('Voice status response:', response.data);
      
      if (response.data.has_phrase) {
        setSafetyPhrase(response.data.phrase);
        setNewPhrase(response.data.phrase);
        setIsEditing(false);
      } else {
        setSafetyPhrase('');
        setNewPhrase('');
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Failed to load voice status:', error);
      // Fallback to editing mode if loading fails
      setIsEditing(true);
    } finally {
      setIsLoading(false);
    }
  };

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
      // Handle demo mode
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        // Demo mode - save to local storage
        localStorage.setItem('demo_safety_phrase', newPhrase.trim());
        localStorage.setItem('demo_phrase_password', phrasePassword);
        
        setSafetyPhrase(newPhrase.trim());
        setIsEditing(false);
        setPhrasePassword('');
        toast.success('✅ Demo safety phrase saved successfully');
        return;
      }

      // Real backend call
      const response = await voiceAPI.trainPhrase({
        phrase: newPhrase.trim(),
        phrase_password: phrasePassword,
      });

      console.log('Train phrase response:', response.data);

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
      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(`Failed to save safety phrase: ${error.response.data.detail || error.message}`);
      } else {
        toast.error('Failed to save safety phrase - Please check your connection');
      }
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
      // Handle demo mode
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        const storedPassword = localStorage.getItem('demo_phrase_password');
        if (storedPassword !== phrasePassword) {
          toast.error('Invalid password');
          setIsUpdating(false);
          return;
        }
        
        localStorage.setItem('demo_safety_phrase', newPhrase.trim());
        setSafetyPhrase(newPhrase.trim());
        setIsEditing(false);
        setPhrasePassword('');
        toast.success('✅ Demo safety phrase updated successfully');
        return;
      }

      // Real backend call
      const response = await voiceAPI.updatePhrase({
        phrase: newPhrase.trim(),
        old_password: phrasePassword,
        new_password: phrasePassword, // Using same password for simplicity
      });

      console.log('Update phrase response:', response.data);

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
      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(`Failed to update safety phrase: ${error.response.data.detail || error.message}`);
      } else {
        toast.error('Failed to update safety phrase - Please check your connection');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleListening = () => {
    console.log('Toggle listening clicked');
    toggleListening();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Voice Guard</h3>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading voice settings...</p>
        </div>
      </div>
    );
  }

  if (!voiceRecognitionSupported) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Voice Recognition</h3>
        <div className="text-center text-gray-500">
          <MicOff size={48} className="mx-auto mb-2 text-gray-400" />
          <p>Voice recognition is not supported in your browser</p>
          <p className="text-sm mt-1">Please use Chrome or Safari with HTTPS</p>
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
          onClick={handleToggleListening}
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
        {localStorage.getItem('token') === 'demo-token-for-testing' && (
          <p className="text-orange-600 font-medium mt-2">Demo Mode: Voice phrases saved locally</p>
        )}
      </div>
    </div>
  );
};

export default VoiceControl;


