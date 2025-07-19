import React, { useEffect } from 'react';
import { MapPin, Users, Navigation } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import { useLocationStore } from '../../store/useStore';

const LocationStatus = () => {
  const { 
    currentLocation, 
    nearbyUsers, 
    locationPermission, 
    isTrackingLocation 
  } = useLocationStore();
  
  const { 
    startLocationTracking, 
    stopLocationTracking, 
    requestLocationPermission 
  } = useLocation();

  useEffect(() => {
    // Auto-start location tracking if permission is granted
    if (locationPermission === 'granted' && !isTrackingLocation) {
      startLocationTracking();
    }
  }, [locationPermission, isTrackingLocation, startLocationTracking]);

  const handleLocationToggle = async () => {
    if (!isTrackingLocation) {
      if (locationPermission !== 'granted') {
        await requestLocationPermission();
      } else {
        startLocationTracking();
      }
    } else {
      stopLocationTracking();
    }
  };

  const getLocationStatus = () => {
    if (locationPermission === 'denied') return 'Permission denied';
    if (locationPermission === 'granted' && isTrackingLocation) return 'Tracking active';
    if (locationPermission === 'granted' && !isTrackingLocation) return 'Available';
    return 'Getting permission...';
  };

  const getLocationColor = () => {
    if (locationPermission === 'denied') return 'text-red-500';
    if (isTrackingLocation) return 'text-green-500';
    return 'text-yellow-500';
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Location Status */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className={`${getLocationColor()}`} size={20} />
          <span className="font-semibold text-gray-800">Location</span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">
          {getLocationStatus()}
        </p>
        
        {currentLocation && (
          <div className="text-xs text-gray-500 mb-3">
            <p>Lat: {currentLocation.latitude.toFixed(6)}</p>
            <p>Lng: {currentLocation.longitude.toFixed(6)}</p>
            {currentLocation.accuracy && (
              <p>Accuracy: ±{Math.round(currentLocation.accuracy)}m</p>
            )}
          </div>
        )}
        
        <button
          onClick={handleLocationToggle}
          className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            isTrackingLocation
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {isTrackingLocation ? 'Stop Tracking' : 'Start Tracking'}
        </button>
      </div>
      
      {/* Nearby Users */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="text-blue-500" size={20} />
          <span className="font-semibold text-gray-800">Nearby</span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">
          {nearbyUsers.length} SafeGuard users
        </p>
        
        {nearbyUsers.length > 0 && (
          <div className="space-y-1 mb-3">
            {nearbyUsers.slice(0, 3).map((user, index) => (
              <div key={user.id || index} className="text-xs text-gray-500 flex justify-between">
                <span>{user.name}</span>
                <span>{user.distance?.toFixed(1) || '~1.5'}km</span>
              </div>
            ))}
            {nearbyUsers.length > 3 && (
              <p className="text-xs text-blue-500">+{nearbyUsers.length - 3} more</p>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Navigation size={12} />
          <span>Auto-updating</span>
        </div>
      </div>
    </div>
  );
};

export default LocationStatus;