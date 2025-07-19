import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Phone, Edit3, Save, X } from 'lucide-react';
import { useAppStore, useAuthStore } from '../../store/useStore';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const EmergencyContacts = () => {
  const { emergencyContacts, setEmergencyContacts, addEmergencyContact, removeEmergencyContact } = useAppStore();
  const { user } = useAuthStore();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
  });

  // Load emergency contacts on mount
  useEffect(() => {
    loadEmergencyContacts();
  }, []);

  const loadEmergencyContacts = async () => {
    try {
      const response = await userAPI.getEmergencyContacts();
      setEmergencyContacts(response.data || []);
    } catch (error) {
      console.error('Failed to load emergency contacts:', error);
    }
  };

  const handleAddContact = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone number are required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await userAPI.addEmergencyContact(formData);
      addEmergencyContact(response.data);
      setFormData({ name: '', phone: '', relationship: '' });
      setIsAdding(false);
      toast.success('✅ Emergency contact added');
    } catch (error) {
      console.error('Failed to add contact:', error);
      toast.error('Failed to add emergency contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to remove this contact?')) {
      return;
    }

    try {
      await userAPI.removeEmergencyContact(contactId);
      removeEmergencyContact(contactId);
      toast.success('✅ Emergency contact removed');
    } catch (error) {
      console.error('Failed to remove contact:', error);
      toast.error('Failed to remove emergency contact');
    }
  };

  const handleEditContact = (contact) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship || '',
    });
  };

  const handleSaveEdit = async (contactId) => {
    // For simplicity, we'll remove and re-add the contact
    // In a real app, you'd have an update endpoint
    try {
      await userAPI.removeEmergencyContact(contactId);
      const response = await userAPI.addEmergencyContact(formData);
      
      // Update local state
      const updatedContacts = emergencyContacts.map(contact => 
        contact.id === contactId ? response.data : contact
      );
      setEmergencyContacts(updatedContacts);
      
      setEditingId(null);
      setFormData({ name: '', phone: '', relationship: '' });
      toast.success('✅ Contact updated');
    } catch (error) {
      console.error('Failed to update contact:', error);
      toast.error('Failed to update contact');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', phone: '', relationship: '' });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Emergency Contacts</h3>
        <button
          onClick={() => setIsAdding(true)}
          disabled={isAdding || editingId}
          className="text-pink-500 hover:text-pink-600 disabled:text-gray-400"
        >
          <UserPlus size={20} />
        </button>
      </div>

      {/* Add Contact Form */}
      {isAdding && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="font-medium mb-3 text-gray-800">Add Emergency Contact</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
            <input
              type="text"
              placeholder="Relationship (optional)"
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddContact}
                disabled={isLoading || !formData.name.trim() || !formData.phone.trim()}
                className="flex-1 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isLoading ? 'Adding...' : 'Add Contact'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts List */}
      {emergencyContacts.length === 0 ? (
        <div className="text-center py-8">
          <Users className="mx-auto text-gray-400 mb-2" size={48} />
          <p className="text-gray-500">No emergency contacts added</p>
          <p className="text-sm text-gray-400 mt-1">Add contacts who will be notified during emergencies</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emergencyContacts.map((contact) => (
            <div key={contact.id} className="border border-gray-200 rounded-lg p-3">
              {editingId === contact.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Relationship"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(contact.id)}
                      className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm"
                    >
                      <Save size={14} />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 text-gray-600 hover:text-gray-700 text-sm"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-800">{contact.name}</p>
                        <p className="text-sm text-gray-600">{contact.phone}</p>
                        {contact.relationship && (
                          <p className="text-xs text-gray-500">{contact.relationship}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditContact(contact)}
                      disabled={isAdding || editingId}
                      className="text-blue-500 hover:text-blue-600 disabled:text-gray-400"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleRemoveContact(contact.id)}
                      disabled={isAdding || editingId}
                      className="text-red-500 hover:text-red-600 disabled:text-gray-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {emergencyContacts.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <p className="font-medium text-blue-800 mb-1">Emergency Alert Process:</p>
          <p>• SMS alerts sent to all contacts immediately</p>
          <p>• Your live location shared automatically</p>
          <p>• Voice recording sent after emergency ends</p>
        </div>
      )}
    </div>
  );
};

export default EmergencyContacts;