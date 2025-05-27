import React, { useState } from 'react';
import { CustomerGoal } from '../types';

interface GoalsSectionProps {
  goals: CustomerGoal[];
  isLoading: boolean;
  error: string | null;
  onAddGoal: (goalText: string, priority: string, status: string, agentName?: string) => Promise<void>;
  onUpdateGoal: (goalId: string, goalText: string, priority?: string, status?: string, agentName?: string) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  formatDate: (date: string | null) => string;
}

export const GoalsSection: React.FC<GoalsSectionProps> = ({
  goals,
  isLoading,
  error,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  formatDate
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState('medium');
  const [newGoalStatus, setNewGoalStatus] = useState('not_started');
  const [newGoalAgentName, setNewGoalAgentName] = useState('');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalText, setEditingGoalText] = useState('');
  const [editingGoalPriority, setEditingGoalPriority] = useState('');
  const [editingGoalStatus, setEditingGoalStatus] = useState('');
  const [editingGoalAgentName, setEditingGoalAgentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle add goal submission
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddGoal(newGoalText, newGoalPriority, newGoalStatus, newGoalAgentName || undefined);
      setNewGoalText('');
      setNewGoalPriority('medium');
      setNewGoalStatus('not_started');
      setNewGoalAgentName('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle update goal submission
  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoalId || !editingGoalText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onUpdateGoal(
        editingGoalId, 
        editingGoalText, 
        editingGoalPriority, 
        editingGoalStatus,
        editingGoalAgentName || undefined
      );
      setEditingGoalId(null);
      setEditingGoalText('');
      setEditingGoalPriority('');
      setEditingGoalStatus('');
      setEditingGoalAgentName('');
    } catch (error) {
      console.error('Error updating goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Start editing a goal
  const startEditingGoal = (goal: CustomerGoal) => {
    setEditingGoalId(goal.id);
    setEditingGoalText(goal.goal_text);
    setEditingGoalPriority(goal.priority || 'medium');
    setEditingGoalStatus(goal.status || 'not_started');
    setEditingGoalAgentName(goal.assigned_agent_name || '');
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingGoalId(null);
    setEditingGoalText('');
    setEditingGoalPriority('');
    setEditingGoalStatus('');
    setEditingGoalAgentName('');
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
            <h4 className="text-lg font-semibold text-gray-800">Goals</h4>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-gray-50 border border-blue-200 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Goal
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
          
          {/* Add Goal Form */}
          {showAddForm && (
            <div className="bg-blue-50 rounded-lg border border-blue-100 mb-6 overflow-hidden">
              <div className="bg-blue-100 px-4 py-3 border-b border-blue-200">
                <h5 className="font-medium text-blue-800">Add New Goal</h5>
              </div>
              <div className="p-4">
                <form onSubmit={handleAddGoal} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Goal Description *
                    </label>
                    <textarea
                      value={newGoalText}
                      onChange={(e) => setNewGoalText(e.target.value)}
                      required
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter a new goal for this customer..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={newGoalPriority}
                        onChange={(e) => setNewGoalPriority(e.target.value)}
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
                        value={newGoalStatus}
                        onChange={(e) => setNewGoalStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Agent (Optional)
                    </label>
                    <input
                      type="text"
                      value={newGoalAgentName}
                      onChange={(e) => setNewGoalAgentName(e.target.value)}
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
                      Add Goal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Goals Table */}
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-3 text-gray-500">Loading goals...</p>
            </div>
          ) : goals.length === 0 ? (
            <div className="flex items-center justify-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 font-medium">No goals defined for this customer</p>
                <p className="text-gray-500 text-sm mt-1">Add goals to track what you want to achieve with this customer</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Goal</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {goals.map((goal) => (
                    <tr key={goal.id} className="hover:bg-gray-50">
                      {editingGoalId === goal.id ? (
                        <td colSpan={6} className="px-6 py-4">
                          <form onSubmit={handleUpdateGoal} className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Goal Description</label>
                              <textarea
                                value={editingGoalText}
                                onChange={(e) => setEditingGoalText(e.target.value)}
                                required
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                  value={editingGoalPriority}
                                  onChange={(e) => setEditingGoalPriority(e.target.value)}
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
                                  value={editingGoalStatus}
                                  onChange={(e) => setEditingGoalStatus(e.target.value)}
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
                                  value={editingGoalAgentName}
                                  onChange={(e) => setEditingGoalAgentName(e.target.value)}
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
                            <div className="text-sm text-gray-900">{goal.goal_text}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClasses(goal.priority)}`}>
                              {getPriorityDisplayText(goal.priority)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(goal.status)}`}>
                              {getStatusDisplayText(goal.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {goal.assigned_agent_name ? (
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-indigo-800">
                                    {goal.assigned_agent_name.substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-2">
                                  <div className="text-sm text-gray-900">{goal.assigned_agent_name}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(goal.updated_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => startEditingGoal(goal)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDeleteGoal(goal.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
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
