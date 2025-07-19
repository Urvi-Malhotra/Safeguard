import React, { useState, useEffect } from 'react';
import { User, Edit3, Save, X } from 'lucide-react';
import { useAuthStore } from '../../store/useStore';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ProfileManagement = () => {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
  });

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await userAPI.updateProfile(formData);
      updateUser(response.data);
      setIsEditing(false);
      toast.success('✅ Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
        address: user.address || '',
      });
    }
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Profile Information</h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-pink-500 hover:text-pink-600 flex items-center gap-1"
          >
            <Edit3 size={16} />
            <span className="text-sm">Edit</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isLoading || !formData.name.trim()}
              className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:text-gray-400"
            >
              <Save size={16} />
              <span className="text-sm">{isLoading ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="text-gray-600 hover:text-gray-700 flex items-center gap-1 disabled:text-gray-400"
            >
              <X size={16} />
              <span className="text-sm">Cancel</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mb-6">
        {user.profile_picture ? (
          <img
            src={user.profile_picture}
            alt="Profile"
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
            <User className="text-pink-500" size={24} />
          </div>
        )}
        <div>
          <h4 className="font-medium text-gray-800">{user.name}</h4>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="+91 9876543210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="">Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Enter your address"
              rows="3"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Phone:</span>
            <span className="text-sm text-gray-800">{user.phone || 'Not provided'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Date of Birth:</span>
            <span className="text-sm text-gray-800">
              {user.date_of_birth || 'Not provided'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Gender:</span>
            <span className="text-sm text-gray-800 capitalize">
              {user.gender || 'Not specified'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Address:</span>
            <span className="text-sm text-gray-800 text-right max-w-48">
              {user.address || 'Not provided'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileManagement;