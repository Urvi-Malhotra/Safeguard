import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '658977310896-knrl3gka66fldh83dao2rhgbblmd4un9.apps.googleusercontent.com',
          callback: handleGoogleResponse,
        });

        // Try to render the button
        const buttonElement = document.getElementById('google-signin-button');
        if (buttonElement) {
          window.google.accounts.id.renderButton(buttonElement, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            shape: 'rectangular',
          });
        }
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleGoogleResponse = async (response) => {
    console.log('Google response received:', response);
    setIsLoading(true);
    
    try {
      // Send the JWT credential to your backend
      const backendResponse = await authAPI.googleLogin(response.credential);
      console.log('Backend response:', backendResponse.data);

      const data = backendResponse.data;
      
      // Store token and user data
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setAuth(data.user, data.access_token);
      toast.success('✅ Successfully signed in!');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Login failed:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(`Login failed: ${error.response.data.detail || error.message}`);
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    console.log('Demo login clicked');
    setIsLoading(true);
    
    try {
      // Demo login for testing
      const demoUser = {
        id: 'demo-user-1',
        name: 'Demo User',
        email: 'demo@safeguard.com',
        profile_picture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
        phone: '+1234567890',
        date_of_birth: '1990-01-01',
        gender: 'female',
        address: '123 Demo Street, Demo City'
      };
      
      const demoToken = 'demo-token-for-testing';
      
      localStorage.setItem('token', demoToken);
      localStorage.setItem('user', JSON.stringify(demoUser));
      
      setAuth(demoUser, demoToken);
      toast.success('✅ Demo login successful!');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Demo login failed:', error);
      toast.error('Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-pink-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">SafeGuard</h1>
          <p className="text-gray-600">Your personal safety companion</p>
        </div>
        
        {/* Google Sign-In Button */}
        <div className="mb-4">
          <div id="google-signin-button" className="w-full"></div>
        </div>
        
        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-gray-500 text-sm">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>
        
        {/* Demo Login Button */}
        <button
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Shield size={20} />
          )}
          {isLoading ? 'Signing in...' : 'Demo Login (For Testing)'}
        </button>
        
        <p className="text-xs text-gray-500 text-center mt-4">
          By signing in, you agree to our terms and privacy policy
        </p>

        {/* Setup Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-1">Setup Instructions:</p>
          <p className="text-xs text-blue-700">
            1. For real Google OAuth, add your Google Client ID to environment variables<br/>
            2. Use Demo Login for immediate testing<br/>
            3. Enable location and microphone permissions when prompted<br/>
            4. Set up your emergency contacts and safety phrase
          </p>
        </div>

        {/* Feature Preview */}
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800 font-medium mb-1">Features Available:</p>
          <div className="text-xs text-green-700 grid grid-cols-2 gap-1">
            <p>✅ Voice Recognition</p>
            <p>✅ Emergency SOS</p>
            <p>✅ SMS Alerts</p>
            <p>✅ Location Tracking</p>
            <p>✅ Real-time Alerts</p>
            <p>✅ Audio Recording</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


