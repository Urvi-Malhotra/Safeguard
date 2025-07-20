import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Phone, Edit3, Save, X, Users } from 'lucide-react';
import { useAppStore, useAuthStore } from '../../store/useStore';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const EmergencyContacts = () => {
  const { emergencyContacts, setEmergencyContacts, addEmergencyContact, removeEmergencyContact } = useAppStore();
  const { user } = useAuthStore();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(true);
      
      // Handle demo mode
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        const demoContacts = JSON.parse(localStorage.getItem('demo_emergency_contacts') || '[]');
        setEmergencyContacts(demoContacts);
        setIsLoading(false);
        return;
      }

      // Real backend call
      const response = await userAPI.getEmergencyContacts();
      console.log('Emergency contacts response:', response.data);
      setEmergencyContacts(response.data || []);
    } catch (error) {
      console.error('Failed to load emergency contacts:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      // Set empty array on error
      setEmergencyContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone number are required');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      // Handle demo mode
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        const newContact = {
          id: 'demo-' + Date.now(),
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          relationship: formData.relationship.trim(),
          created_at: new Date().toISOString(),
        };
        
        const updatedContacts = [...emergencyContacts, newContact];
        localStorage.setItem('demo_emergency_contacts', JSON.stringify(updatedContacts));
        
        addEmergencyContact(newContact);
        setFormData({ name: '', phone: '', relationship: '' });
        setIsAdding(false);
        toast.success('✅ Demo emergency contact added');
        return;
      }

      // Real backend call
      const response = await userAPI.addEmergencyContact(formData);
      console.log('Add contact response:', response.data);
      
      addEmergencyContact(response.data);
      setFormData({ name: '', phone: '', relationship: '' });
      setIsAdding(false);
      toast.success('✅ Emergency contact added');
    } catch (error) {
      console.error('Failed to add contact:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(`Failed to add emergency contact: ${error.response.data.detail || error.message}`);
      } else {
        toast.error('Failed to add emergency contact - Please check your connection');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to remove this contact?')) {
      return;
    }

    try {
      // Handle demo mode
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        const updatedContacts = emergencyContacts.filter(c => c.id !== contactId);
        localStorage.setItem('demo_emergency_contacts', JSON.stringify(updatedContacts));
        
        removeEmergencyContact(contactId);
        toast.success('✅ Demo emergency contact removed');
        return;
      }

      // Real backend call
      await userAPI.removeEmergencyContact(contactId);
      console.log('Contact removed:', contactId);
      
      removeEmergencyContact(contactId);
      toast.success('✅ Emergency contact removed');
    } catch (error) {
      console.error('Failed to remove contact:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(`Failed to remove emergency contact: ${error.response.data.detail || error.message}`);
      } else {
        toast.error('Failed to remove emergency contact - Please check your connection');
      }
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
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone number are required');
      return;
    }

    try {
      // Handle demo mode
      if (localStorage.getItem('token') === 'demo-token-for-testing') {
        const updatedContacts = emergencyContacts.map(contact => 
          contact.id === contactId 
            ? { ...contact, ...formData, name: formData.name.trim(), phone: formData.phone.trim() }
            : contact
        );
        localStorage.setItem('demo_emergency_contacts', JSON.stringify(updatedContacts));
        setEmergencyContacts(updatedContacts);
        
        setEditingId(null);
        setFormData({ name: '', phone: '', relationship: '' });
        toast.success('✅ Demo contact updated');
        return;
      }

      // For real backend, we need to remove and re-add (simplified approach)
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
      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(`Failed to update contact: ${error.response.data.detail || error.message}`);
      } else {
        toast.error('Failed to update contact - Please check your connection');
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', phone: '', relationship: '' });
  };

  const handleAddClick = () => {
    console.log('Add contact button clicked');
    setIsAdding(true);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Emergency Contacts</h3>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading emergency contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Emergency Contacts</h3>
        <button
          onClick={handleAddClick}
          disabled={isAdding || editingId}
          className="text-pink-500 hover:text-pink-600 disabled:text-gray-400 transition-colors"
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
              placeholder="Phone Number (+1234567890)"
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
                disabled={!formData.name.trim() || !formData.phone.trim()}
                className="flex-1 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Add Contact
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
          {localStorage.getItem('token') === 'demo-token-for-testing' && (
            <p className="text-orange-600 text-xs mt-2">Demo Mode: Contacts saved locally</p>
          )}
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
                    placeholder="Name"
                  />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Phone"
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
                      disabled={!formData.name.trim() || !formData.phone.trim()}
                      className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm disabled:text-gray-400"
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
                      className="text-blue-500 hover:text-blue-600 disabled:text-gray-400 transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleRemoveContact(contact.id)}
                      disabled={isAdding || editingId}
                      className="text-red-500 hover:text-red-600 disabled:text-gray-400 transition-colors"
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
          {localStorage.getItem('token') === 'demo-token-for-testing' && (
            <p className="text-orange-600 font-medium mt-1">Demo Mode: SMS simulation only</p>
          )}
        </div>
      )}
    </div>
  );
};

export default EmergencyContacts;


