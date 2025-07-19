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