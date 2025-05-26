import React, { useState } from 'react';
import { CustomerDetails } from '../types';

interface CustomerProfileSectionProps {
  customer: CustomerDetails;
  onSave: (profile: string) => Promise<void>;
  formatDate: (date: string | null) => string;
}

export const CustomerProfileSection: React.FC<CustomerProfileSectionProps> = ({
  customer,
  onSave,
  formatDate
}) => {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(customer.customer_profile || '');
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(profile);
      setEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-md font-medium">Customer Profile</h4>
          {customer.customer_profile_update_time && (
            <p className="text-xs text-gray-500">
              Last updated: {formatDate(customer.customer_profile_update_time)}
            </p>
          )}
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              disabled={saving}
            >
              {saving && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Save Profile
            </button>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg p-4 shadow-sm">
        {editing ? (
          <textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Enter customer profile information..."
          />
        ) : (
          <div className="prose max-w-none">
            {customer.customer_profile ? (
              <div className="whitespace-pre-wrap">{customer.customer_profile}</div>
            ) : (
              <p className="text-gray-500 italic">No profile information available. Click 'Edit Profile' to add details.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
