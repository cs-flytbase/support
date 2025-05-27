import React, { useState } from 'react';
import { KeyDeliverable } from '../types';

interface KeyDeliverablesSectionProps {
  deliverables: KeyDeliverable[];
  isLoading: boolean;
  error: string | null;
  onAddDeliverable: (deliverableText: string, isEditable: boolean, priority: string, status: string, agentName?: string) => Promise<void>;
  onUpdateDeliverable: (deliverableId: string, deliverableText: string, priority?: string, status?: string, agentName?: string) => Promise<void>;
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
  const [newDeliverablePriority, setNewDeliverablePriority] = useState('medium');
  const [newDeliverableStatus, setNewDeliverableStatus] = useState('not_started');
  const [newDeliverableAgentName, setNewDeliverableAgentName] = useState('');
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null);
  const [editingDeliverableText, setEditingDeliverableText] = useState('');
  const [editingDeliverablePriority, setEditingDeliverablePriority] = useState('');
  const [editingDeliverableStatus, setEditingDeliverableStatus] = useState('');
  const [editingDeliverableAgentName, setEditingDeliverableAgentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle add deliverable submission
  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeliverableText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddDeliverable(
        newDeliverableText, 
        newDeliverableEditable, 
        newDeliverablePriority, 
        newDeliverableStatus,
        newDeliverableAgentName || undefined
      );
      setNewDeliverableText('');
      setNewDeliverableEditable(true);
      setNewDeliverablePriority('medium');
      setNewDeliverableStatus('not_started');
      setNewDeliverableAgentName('');
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
      await onUpdateDeliverable(
        editingDeliverableId, 
        editingDeliverableText, 
        editingDeliverablePriority, 
        editingDeliverableStatus,
        editingDeliverableAgentName || undefined
      );
      setEditingDeliverableId(null);
      setEditingDeliverableText('');
      setEditingDeliverablePriority('');
      setEditingDeliverableStatus('');
      setEditingDeliverableAgentName('');
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
    setEditingDeliverablePriority(deliverable.priority || 'medium');
    setEditingDeliverableStatus(deliverable.status || 'not_started');
    setEditingDeliverableAgentName(deliverable.assigned_agent_name || '');
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingDeliverableId(null);
    setEditingDeliverableText('');
    setEditingDeliverablePriority('');
    setEditingDeliverableStatus('');
    setEditingDeliverableAgentName('');
  };
  
  // Helper function to get priority badge color
  const getPriorityBadgeClasses = (priority: string) => {
    switch(priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get status badge color
  const getStatusBadgeClasses = (status: string) => {
    switch(status) {
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get status display text
  const getStatusDisplayText = (status: string) => {
    switch(status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'not_started':
        return 'Not Started';
      default:
        return 'Unknown';
    }
  };

  // Helper function to get priority display text
  const getPriorityDisplayText = (priority: string) => {
    switch(priority) {
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        return 'Medium';
    }
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={newDeliverablePriority}
                        onChange={(e) => setNewDeliverablePriority(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={newDeliverableStatus}
                        onChange={(e) => setNewDeliverableStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="newDeliverableEditable"
                      checked={newDeliverableEditable}
                      onChange={(e) => setNewDeliverableEditable(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="newDeliverableEditable" className="ml-2 block text-sm text-gray-700">
                      Make this deliverable editable
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Agent (Optional)
                    </label>
                    <input
                      type="text"
                      value={newDeliverableAgentName}
                      onChange={(e) => setNewDeliverableAgentName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter agent name..."
                    />
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
          
          {/* Deliverables Table */}
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deliverable</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Editable</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deliverables.map((deliverable) => (
                    <tr key={deliverable.id} className="hover:bg-gray-50">
                      {editingDeliverableId === deliverable.id ? (
                        <td colSpan={7} className="px-6 py-4">
                          <form onSubmit={handleUpdateDeliverable} className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Deliverable Description</label>
                              <textarea
                                value={editingDeliverableText}
                                onChange={(e) => setEditingDeliverableText(e.target.value)}
                                required
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                  value={editingDeliverablePriority}
                                  onChange={(e) => setEditingDeliverablePriority(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="low">Low</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                  value={editingDeliverableStatus}
                                  onChange={(e) => setEditingDeliverableStatus(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                  <option value="not_started">Not Started</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Agent</label>
                                <input
                                  type="text"
                                  value={editingDeliverableAgentName}
                                  onChange={(e) => setEditingDeliverableAgentName(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter agent name..."
                                />
                              </div>
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
                        </td>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-normal">
                            <div className="text-sm text-gray-900">{deliverable.deliverable_text}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClasses(deliverable.priority)}`}>
                              {getPriorityDisplayText(deliverable.priority)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(deliverable.status)}`}>
                              {getStatusDisplayText(deliverable.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {deliverable.assigned_agent_name ? (
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-indigo-800">
                                    {deliverable.assigned_agent_name.substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-2">
                                  <div className="text-sm text-gray-900">{deliverable.assigned_agent_name}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {deliverable.is_editable ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Yes</span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">No</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(deliverable.updated_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {deliverable.is_editable && (
                              <>
                                <button
                                  onClick={() => startEditingDeliverable(deliverable)}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => onDeleteDeliverable(deliverable.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
