import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Phone, Shield } from 'lucide-react';
import { useEmergency } from '../../hooks/useEmergency';
import toast from 'react-hot-toast';

const EmergencyButton = () => {
  const { triggerEmergency, isTriggering, isEmergencyActive } = useEmergency();
  const [holdCount, setHoldCount] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const holdIntervalRef = useRef(null);
  const confirmationTimeoutRef = useRef(null);

  const HOLD_DURATION = 30; // 3 seconds (30 * 100ms)
  const CONFIRMATION_TIMEOUT = 10000; // 10 seconds to confirm

  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
      }
    };
  }, []);

  const startHold = () => {
    if (isEmergencyActive || isTriggering || showConfirmation) return;
    
    setIsHolding(true);
    setHoldCount(0);
    
    holdIntervalRef.current = setInterval(() => {
      setHoldCount(prevCount => {
        const newCount = prevCount + 1;
        
        if (newCount >= HOLD_DURATION) {
          clearInterval(holdIntervalRef.current);
          setIsHolding(false);
          setHoldCount(0);
          showEmergencyConfirmation();
          return 0;
        }
        
        return newCount;
      });
    }, 100);
  };

  const stopHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setIsHolding(false);
    setHoldCount(0);
  };

  const showEmergencyConfirmation = () => {
    setShowConfirmation(true);
    toast.error('🚨 Emergency will trigger in 10 seconds! Tap "Cancel" to stop.', {
      duration: 10000,
    });
    
    confirmationTimeoutRef.current = setTimeout(() => {
      confirmEmergency();
    }, CONFIRMATION_TIMEOUT);
  };

  const confirmEmergency = async () => {
    setShowConfirmation(false);
    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
    }
    
    try {
      await triggerEmergency('manual');
    } catch (error) {
      console.error('Failed to trigger emergency:', error);
    }
  };

  const cancelEmergency = () => {
    setShowConfirmation(false);
    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
    }
    toast.success('Emergency cancelled');
  };

  const handleQuickTrigger = () => {
    if (!isEmergencyActive && !isTriggering && !showConfirmation) {
      showEmergencyConfirmation();
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    startHold();
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    stopHold();
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    startHold();
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    stopHold();
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => stopHold();
    const handleGlobalTouchEnd = () => stopHold();
    
    if (isHolding) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isHolding]);

  const progressPercentage = (holdCount / HOLD_DURATION) * 100;

  if (showConfirmation) {
    return (
      <div className="relative">
        <div className="text-center space-y-4">
          <div className="bg-red-500 w-32 h-32 rounded-full flex flex-col items-center justify-center text-white font-bold animate-pulse">
            <AlertTriangle size={32} />
            <span className="text-sm mt-1">CONFIRM</span>
          </div>
          
          <div className="space-y-2">
            <p className="text-red-600 font-semibold">Emergency will trigger automatically!</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={confirmEmergency}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Trigger Now
              </button>
              <button
                onClick={cancelEmergency}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Main Emergency Button */}
      <div className="relative">
        <button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={isEmergencyActive || isTriggering}
          className={`w-32 h-32 rounded-full flex flex-col items-center justify-center text-white font-bold text-lg shadow-lg transition-all duration-200 select-none ${
            isEmergencyActive 
              ? 'bg-gray-400 cursor-not-allowed' 
              : isTriggering
              ? 'bg-red-600 animate-pulse'
              : isHolding
              ? 'bg-red-600 scale-95'
              : 'bg-red-500 hover:bg-red-600 active:scale-95'
          }`}
        >
          <AlertTriangle size={32} />
          <span className="text-sm mt-1">
            {isEmergencyActive ? 'ACTIVE' : isHolding ? 'HOLD' : 'SOS'}
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
        disabled={isEmergencyActive || isTriggering || showConfirmation}
        className={`mt-4 w-32 py-2 rounded-lg flex items-center justify-center gap-2 text-white font-semibold transition-colors ${
          isEmergencyActive || isTriggering || showConfirmation
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-orange-500 hover:bg-orange-600'
        }`}
      >
        <Phone size={16} />
        <span className="text-sm">Quick SOS</span>
      </button>

      {/* Instructions */}
      <div className="text-center mt-3">
        <p className="text-xs text-gray-600 max-w-32">
          Hold red button for 3 seconds or tap Quick SOS
        </p>
        {isHolding && (
          <p className="text-xs text-red-600 font-medium mt-1">
            Keep holding... {Math.ceil((HOLD_DURATION - holdCount) / 10)}s
          </p>
        )}
      </div>

      {/* Safety Notice */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="text-yellow-600" size={16} />
          <span className="text-xs font-medium text-yellow-800">Safety Features</span>
        </div>
        <div className="text-xs text-yellow-700 space-y-1">
          <p>• 10-second confirmation before triggering</p>
          <p>• Emergency contacts will be notified via SMS</p>
          <p>• Nearby SafeGuard users will be alerted</p>
          <p>• Your location will be shared automatically</p>
          <p>• 15-minute audio recording will start</p>
        </div>
      </div>
    </div>
  );
};

export default EmergencyButton;


