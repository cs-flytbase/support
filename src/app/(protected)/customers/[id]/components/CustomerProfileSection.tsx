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
  const [error, setError] = useState<string | null>(null);
  
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
  
  const handleEdit = () => {
    setProfile(customer.customer_profile || '');
    setEditing(true);
  };

  return (
    <div className="mt-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold text-gray-800">Customer Profile</h4>
            {!editing && customer.customer_profile && (
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-white text-purple-600 rounded-md hover:bg-gray-50 border border-purple-200 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Profile
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p>{error}</p>
              </div>
            </div>
          )}
          
          {editing ? (
            <div className="bg-purple-50 rounded-lg border border-purple-100 mb-4 overflow-hidden">
              <div className="bg-purple-100 px-4 py-3 border-b border-purple-200">
                <h5 className="font-medium text-purple-800">{customer.customer_profile ? 'Edit' : 'Add'} Customer Profile</h5>
              </div>
              <div className="p-4">
                <form onSubmit={() => handleSave()} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="profile">
                      Customer Profile Information
                    </label>
                    <textarea
                      id="profile"
                      rows={5}
                      value={profile}
                      onChange={(e) => setProfile(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      placeholder="Enter important information about this customer..."
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium shadow-sm"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 text-sm font-medium shadow-sm"
                      disabled={saving}
                    >
                      {saving && (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      Save Profile
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div>
              {customer.customer_profile ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 border border-gray-200 rounded-lg">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{customer.customer_profile}</div>
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-500 pl-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Last updated: {customer.customer_profile_update_time ? formatDate(customer.customer_profile_update_time) : 'Never'}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-gray-500 font-medium">No profile information available</p>
                    <p className="text-gray-500 text-sm mt-1 mb-4">Add details about this customer's needs and background</p>
                    
                    <button
                      onClick={handleEdit}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 inline-flex items-center gap-2 text-sm font-medium shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Profile Information
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
