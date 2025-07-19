import { useState, useEffect, useCallback } from 'react';
import { useLocationStore } from '../store/useStore';
import { locationAPI } from '../services/api';
import socketService from '../services/socketService';
import toast from 'react-hot-toast';

export const useLocation = () => {
  const {
    currentLocation,
    nearbyUsers,
    locationPermission,
    isTrackingLocation,
    setCurrentLocation,
    setNearbyUsers,
    setLocationPermission,
    setLocationTracking,
  } = useLocationStore();

  const [watchId, setWatchId] = useState(null);

  // Initialize location tracking
  useEffect(() => {
    checkLocationSupport();
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const checkLocationSupport = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      setLocationPermission('denied');
      return false;
    }
    return true;
  };

  const requestLocationPermission = useCallback(async () => {
    if (!checkLocationSupport()) return false;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationPermission('granted');
          handleLocationUpdate(position);
          resolve(true);
        },
        (error) => {
          console.error('Location permission error:', error);
          setLocationPermission('denied');
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              toast.error('Location permission denied');
              break;
            case error.POSITION_UNAVAILABLE:
              toast.error('Location information unavailable');
              break;
            case error.TIMEOUT:
              toast.error('Location request timeout');
              break;
            default:
              toast.error('Unknown location error');
              break;
          }
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, [setLocationPermission]);

  const handleLocationUpdate = useCallback(async (position) => {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString(),
    };

    setCurrentLocation(location);

    try {
      // Update location on server
      await locationAPI.update({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      });

      // Send location via WebSocket
      socketService.updateLocation(
        location.latitude,
        location.longitude,
        location.accuracy
      );

      // Get nearby users
      const nearbyResponse = await locationAPI.getNearbyUsers(
        location.latitude,
        location.longitude
      );
      setNearbyUsers(nearbyResponse.data.users || []);

    } catch (error) {
      console.error('Failed to update location:', error);
    }
  }, [setCurrentLocation, setNearbyUsers]);

  const startLocationTracking = useCallback(async () => {
    if (!checkLocationSupport()) return false;

    if (locationPermission !== 'granted') {
      const granted = await requestLocationPermission();
      if (!granted) return false;
    }

    if (isTrackingLocation) return true;

    const id = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      (error) => {
        console.error('Location tracking error:', error);
        toast.error('Location tracking error');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000, // 1 minute
      }
    );

    setWatchId(id);
    setLocationTracking(true);
    toast.success('📍 Location tracking started');
    return true;
  }, [
    locationPermission,
    isTrackingLocation,
    requestLocationPermission,
    handleLocationUpdate,
    setLocationTracking,
  ]);

  const stopLocationTracking = useCallback(() => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setLocationTracking(false);
    toast.success('📍 Location tracking stopped');
  }, [watchId, setLocationTracking]);

  const getCurrentLocation = useCallback(async () => {
    if (!checkLocationSupport()) return null;

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setCurrentLocation(location);
          resolve(location);
        },
        (error) => {
          console.error('Get current location error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  }, [setCurrentLocation]);

  return {
    currentLocation,
    nearbyUsers,
    locationPermission,
    isTrackingLocation,
    requestLocationPermission,
    startLocationTracking,
    stopLocationTracking,
    getCurrentLocation,
  };
};