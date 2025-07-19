import React from 'react';
import { Shield, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '../../store/useStore';

const Layout = ({ children }) => {
  const { isOnline } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="bg-red-500 text-white p-2 text-center text-sm flex items-center justify-center gap-2">
          <WifiOff size={16} />
          You are offline - Some features may not work
        </div>
      )}
      
      {children}
    </div>
  );
};

export default Layout;
