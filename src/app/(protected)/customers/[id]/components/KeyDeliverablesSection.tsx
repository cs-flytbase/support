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
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex justify-between mb-4">
        <h4 className="text-md font-medium mb-2">Key Deliverables</h4>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1 bg-green-100 text-green-600 rounded-md hover:bg-green-200 transition-colors"
        >
          Add Deliverable
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Add Deliverable Form */}
      {showAddForm && (
        <div className="p-4 border border-gray-200 rounded-md mb-4 bg-gray-50">
          <h5 className="text-md font-medium mb-3">Add New Deliverable</h5>
          <form onSubmit={handleAddDeliverable} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deliverable Description *
              </label>
              <textarea
                value={newDeliverableText}
                onChange={(e) => setNewDeliverableText(e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter a key deliverable for this customer..."
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="deliverable-editable"
                checked={newDeliverableEditable}
                onChange={(e) => setNewDeliverableEditable(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="deliverable-editable" className="ml-2 block text-sm text-gray-900">
                Make this deliverable editable
              </label>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Add Deliverable
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Deliverables List */}
      {isLoading ? (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-1 text-sm text-gray-500">Loading deliverables...</p>
        </div>
      ) : deliverables.length === 0 ? (
        <div className="p-4 text-center text-gray-500 bg-white rounded-lg shadow-sm">
          <p>No key deliverables defined for this customer.</p>
          <p className="text-sm mt-2">Add deliverables to track what you need to provide to this customer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliverables.map((deliverable) => (
            <div key={deliverable.id} className="bg-white rounded-lg shadow-sm p-4">
              {editingDeliverableId === deliverable.id ? (
                <form onSubmit={handleUpdateDeliverable} className="space-y-3">
                  <textarea
                    value={editingDeliverableText}
                    onChange={(e) => setEditingDeliverableText(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex justify-end space-x-2 text-sm">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-2 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && (
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="whitespace-pre-wrap mb-3">{deliverable.deliverable_text}</div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-500">
                        Updated {formatDate(deliverable.updated_at)}
                      </div>
                      {!deliverable.is_editable && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                          Non-editable
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {deliverable.is_editable && (
                        <button
                          onClick={() => startEditingDeliverable(deliverable)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteDeliverable(deliverable.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
