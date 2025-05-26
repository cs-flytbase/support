import React, { useState } from 'react';
import { CustomerGoal } from '../types';

interface GoalsSectionProps {
  goals: CustomerGoal[];
  isLoading: boolean;
  error: string | null;
  onAddGoal: (goalText: string) => Promise<void>;
  onUpdateGoal: (goalId: string, goalText: string) => Promise<void>;
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
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalText, setEditingGoalText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle add goal submission
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddGoal(newGoalText);
      setNewGoalText('');
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
      await onUpdateGoal(editingGoalId, editingGoalText);
      setEditingGoalId(null);
      setEditingGoalText('');
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
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingGoalId(null);
    setEditingGoalText('');
  };
  
  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex justify-between mb-4">
        <h4 className="text-md font-medium mb-2">Customer Goals</h4>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1 bg-green-100 text-green-600 rounded-md hover:bg-green-200 transition-colors"
        >
          Add Goal
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Add Goal Form */}
      {showAddForm && (
        <div className="p-4 border border-gray-200 rounded-md mb-4 bg-gray-50">
          <h5 className="text-md font-medium mb-3">Add New Goal</h5>
          <form onSubmit={handleAddGoal} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Description *
              </label>
              <textarea
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter a new goal for this customer..."
              />
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
                Add Goal
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Goals List */}
      {isLoading ? (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-1 text-sm text-gray-500">Loading goals...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="p-4 text-center text-gray-500 bg-white rounded-lg shadow-sm">
          <p>No goals defined for this customer.</p>
          <p className="text-sm mt-2">Add goals to track what this customer is trying to achieve.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-white rounded-lg shadow-sm p-4">
              {editingGoalId === goal.id ? (
                <form onSubmit={handleUpdateGoal} className="space-y-3">
                  <textarea
                    value={editingGoalText}
                    onChange={(e) => setEditingGoalText(e.target.value)}
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
                  <div className="whitespace-pre-wrap mb-3">{goal.goal_text}</div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-gray-500">
                      Updated {formatDate(goal.updated_at)}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEditingGoal(goal)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
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
