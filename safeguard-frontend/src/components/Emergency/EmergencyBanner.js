import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useEmergencyStore } from '../../store/useStore';
import { useEmergency } from '../../hooks/useEmergency';

const EmergencyBanner = () => {
  const { isEmergencyActive, alarmActive } = useEmergencyStore();
  const { dismissEmergencyAlert } = useEmergency();

  if (!isEmergencyActive) return null;

  return (
    <div className={`w-full p-4 text-white text-center relative ${
      alarmActive ? 'bg-red-600 animate-pulse' : 'bg-red-500'
    }`}>
      <div className="flex items-center justify-center gap-2">
        <AlertTriangle size={20} />
        <span className="font-semibold">
          {alarmActive ? 'EMERGENCY ALERT ACTIVE - ALARM SOUNDING' : 'EMERGENCY ALERT ACTIVE'}
        </span>
      </div>
      
      <button
        onClick={dismissEmergencyAlert}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-red-700 hover:bg-red-800 px-3 py-1 rounded text-sm transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
};

export default EmergencyBanner;
