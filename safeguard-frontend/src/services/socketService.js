import io from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.isConnected = true;
      this.authenticate();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('authenticated', (data) => {
      console.log('✅ Socket authenticated:', data);
    });

    this.socket.on('authentication_error', (error) => {
      console.error('❌ Authentication error:', error);
    });

    // Emergency events
    this.socket.on('emergency_alert', (data) => {
      console.log('🚨 Emergency alert received:', data);
      this.emit('emergency_alert_received', data);
    });

    this.socket.on('emergency_dismissed', (data) => {
      console.log('✅ Emergency dismissed:', data);
      this.emit('emergency_dismissed_received', data);
    });

    this.socket.on('emergency_trigger', (data) => {
      console.log('🚨 Emergency trigger:', data);
      this.emit('emergency_trigger_received', data);
    });

    // Location events
    this.socket.on('location_broadcast', (data) => {
      console.log('📍 Location update received:', data);
      this.emit('location_update_received', data);
    });

    this.socket.on('nearby_users_update', (data) => {
      console.log('👥 Nearby users update:', data);
      this.emit('nearby_users_updated', data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  authenticate() {
    const token = localStorage.getItem('token');
    if (token && this.socket) {
      this.socket.emit('authenticate', { token });
    }
  }

  // Event emitters for server
  updateLocation(latitude, longitude, accuracy = null) {
    if (this.socket && this.isConnected) {
      this.socket.emit('location_update', {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString(),
      });
    }
  }

  detectVoicePhrase(transcript, confidence) {
    if (this.socket && this.isConnected) {
      this.socket.emit('voice_phrase_detected', {
        transcript,
        confidence,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Local event management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
}

export default new SocketService();