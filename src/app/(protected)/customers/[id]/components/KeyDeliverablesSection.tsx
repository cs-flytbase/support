import React, { useState } from 'react';
import { KeyDeliverable } from '../types';

interface KeyDeliverablesSectionProps {
  deliverables: KeyDeliverable[];
  isLoading: boolean;
  error: string | null;
  onAddDeliverable: (deliverableText: string, isEditable: boolean) => Promise<void>;
  onUpdateDeliverable: (deliverableId: string, deliverableText: string) => Promise<void>;
  onDeleteDeliverable: (deliverableId: string) => Promise<void>;
  formatDate: (date: string | null) => string;
}

export const KeyDeliverablesSection: React.FC<KeyDeliverablesSectionProps> = ({
  deliverables,
  isLoading,
  error,
  onAddDeliverable,
  onUpdateDeliverable,
  onDeleteDeliverable,
  formatDate
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeliverableText, setNewDeliverableText] = useState('');
  const [newDeliverableEditable, setNewDeliverableEditable] = useState(true);
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null);
  const [editingDeliverableText, setEditingDeliverableText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle add deliverable submission
  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeliverableText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddDeliverable(newDeliverableText, newDeliverableEditable);
      setNewDeliverableText('');
      setNewDeliverableEditable(true);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding deliverable:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle update deliverable submission
  const handleUpdateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeliverableId || !editingDeliverableText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onUpdateDeliverable(editingDeliverableId, editingDeliverableText);
      setEditingDeliverableId(null);
      setEditingDeliverableText('');
    } catch (error) {
      console.error('Error updating deliverable:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Start editing a deliverable
  const startEditingDeliverable = (deliverable: KeyDeliverable) => {
    setEditingDeliverableId(deliverable.id);
    setEditingDeliverableText(deliverable.deliverable_text);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingDeliverableId(null);
    setEditingDeliverableText('');
  };
  
  return (
    <div className="mt-8 pt-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold text-gray-800">Key Deliverables</h4>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-gray-50 border border-blue-200 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Deliverable
            </button>
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
          
          {/* Add Deliverable Form */}
          {showAddForm && (
            <div className="bg-blue-50 rounded-lg border border-blue-100 mb-6 overflow-hidden">
              <div className="bg-blue-100 px-4 py-3 border-b border-blue-200">
                <h5 className="font-medium text-blue-800">Add New Deliverable</h5>
              </div>
              <div className="p-4">
                <form onSubmit={handleAddDeliverable} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deliverable Description *
                    </label>
                    <textarea
                      value={newDeliverableText}
                      onChange={(e) => setNewDeliverableText(e.target.value)}
                      required
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter a new deliverable for this customer..."
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="newDeliverableCompleted"
                      checked={newDeliverableEditable}
                      onChange={(e) => setNewDeliverableEditable(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="newDeliverableCompleted" className="ml-2 block text-sm text-gray-700">
                      Make this deliverable editable
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium shadow-sm"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm font-medium shadow-sm"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      Add Deliverable
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Deliverables List */}
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-3 text-gray-500">Loading deliverables...</p>
            </div>
          ) : deliverables.length === 0 ? (
            <div className="flex items-center justify-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 font-medium">No deliverables defined for this customer</p>
                <p className="text-gray-500 text-sm mt-1">Add deliverables to track what needs to be delivered to this customer</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {deliverables.map((deliverable) => (
                <div key={deliverable.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {editingDeliverableId === deliverable.id ? (
                    <div className="p-4 border-l-4 border-blue-400">
                      <form onSubmit={handleUpdateDeliverable} className="space-y-3">
                        <textarea
                          value={editingDeliverableText}
                          onChange={(e) => setEditingDeliverableText(e.target.value)}
                          required
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="editDeliverableCompleted"
                            checked={deliverable.is_editable}
                            onChange={(e) => setNewDeliverableEditable(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="editDeliverableCompleted" className="ml-2 block text-sm text-gray-700">
                            Make this deliverable editable
                          </label>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                            disabled={isSubmitting}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
                            disabled={isSubmitting}
                          >
                            {isSubmitting && (
                              <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-start mb-3">
                        <div className="ml-3 flex-grow">
                          <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {deliverable.deliverable_text}
                            {!deliverable.is_editable && (
                              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs inline-block">
                                Non-editable
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-3">
                        <div className="flex items-center text-xs text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Updated {formatDate(deliverable.updated_at)}
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => startEditingDeliverable(deliverable)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-10 10a2 2 0 01-.707.707l-4 1a1 1 0 01-1.414-1.414l1-4a2 2 0 01.707-.707l10-10z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => onDeleteDeliverable(deliverable.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
