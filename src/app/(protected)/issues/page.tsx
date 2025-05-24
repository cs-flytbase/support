"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// Define types for our issue data
type Issue = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
  created_by_customer_id: string | null;
  issue_type: string | null;
  category: string | null;
  first_identified: string | null;
  resolved_at: string | null;
};

type Customer = {
  id: string;
  name: string;
};

// Component for the issue form (both create and edit)
const IssueForm = ({ 
  issue, 
  customers,
  onSubmit, 
  onCancel 
}: { 
  issue?: Issue; 
  customers: Customer[];
  onSubmit: (data: Partial<Issue>) => void; 
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState<Partial<Issue>>(
    issue || {
      title: '',
      description: '',
      status: 'open',
      priority: 'medium',
      issue_type: 'bug',
      category: 'technical',
      created_by_customer_id: '',
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6">{issue ? 'Edit Issue' : 'Create New Issue'}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="created_by_customer_id" className="block text-sm font-medium text-gray-700 mb-1">
            Customer
          </label>
          <select
            id="created_by_customer_id"
            name="created_by_customer_id"
            value={formData.created_by_customer_id || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Customer</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status || 'open'}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority || 'medium'}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="issue_type" className="block text-sm font-medium text-gray-700 mb-1">
            Issue Type
          </label>
          <select
            id="issue_type"
            name="issue_type"
            value={formData.issue_type || 'bug'}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="bug">Bug</option>
            <option value="feature_request">Feature Request</option>
            <option value="inquiry">Inquiry</option>
            <option value="support">Support</option>
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category || 'technical'}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="technical">Technical</option>
            <option value="billing">Billing</option>
            <option value="account">Account</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="mb-4 md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {issue ? 'Update Issue' : 'Create Issue'}
        </button>
      </div>
    </form>
  );
};

// Main Issues Page Component
export default function IssuesPage() {
  // Client-side state
  const [issues, setIssues] = useState<Issue[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  
  const router = useRouter();
  const supabase = createClient();
  
  // Load issues
  const loadIssues = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setIssues(data || []);
    } catch (err: any) {
      console.error('Error loading issues:', err);
      setError(err.message || 'Failed to load issues');
    } finally {
      setIsLoading(false);
    }
  };

  // Load customers for dropdown
  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Error loading customers:', err);
      setError(err.message || 'Failed to load customers');
    }
  };
  
  // Create a new issue
  const createIssue = async (issueData: Partial<Issue>) => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .insert([issueData])
        .select();
      
      if (error) throw error;
      
      await loadIssues();
      setShowForm(false);
    } catch (err: any) {
      console.error('Error creating issue:', err);
      setError(err.message || 'Failed to create issue');
    }
  };
  
  // Update an existing issue
  const updateIssue = async (issueData: Partial<Issue>) => {
    if (!editingIssue?.id) return;
    
    try {
      const { error } = await supabase
        .from('issues')
        .update(issueData)
        .eq('id', editingIssue.id);
      
      if (error) throw error;
      
      await loadIssues();
      setEditingIssue(null);
    } catch (err: any) {
      console.error('Error updating issue:', err);
      setError(err.message || 'Failed to update issue');
    }
  };
  
  // Delete an issue
  const deleteIssue = async (id: string) => {
    try {
      // First delete related customer_issues records
      const { error: relatedError } = await supabase
        .from('customer_issues')
        .delete()
        .eq('issue_id', id);
      
      if (relatedError) throw relatedError;

      // Then delete the issue
      const { error } = await supabase
        .from('issues')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await loadIssues();
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Error deleting issue:', err);
      setError(err.message || 'Failed to delete issue');
    }
  };
  
  // Handle form submission
  const handleFormSubmit = (data: Partial<Issue>) => {
    if (editingIssue) {
      updateIssue(data);
    } else {
      createIssue(data);
    }
  };
  
  // Load issues and customers on initial render
  useEffect(() => {
    loadIssues();
    loadCustomers();
  }, []);
  
  // Filter issues based on search term, customer, status, and time
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // Apply search term filter
      const searchMatch = !searchTerm || 
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (issue.description && issue.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Apply customer filter
      const customerMatch = customerFilter === 'all' || issue.created_by_customer_id === customerFilter;
      
      // Apply status filter
      const statusMatch = statusFilter === 'all' || issue.status === statusFilter;
      
      // Apply time filter
      let timeMatch = true;
      const now = new Date();
      const issueDate = new Date(issue.created_at);
      
      if (timeFilter === 'today') {
        timeMatch = issueDate.toDateString() === now.toDateString();
      } else if (timeFilter === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        timeMatch = issueDate >= weekAgo;
      } else if (timeFilter === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        timeMatch = issueDate >= monthAgo;
      }
      
      return searchMatch && customerMatch && statusMatch && timeMatch;
    });
  }, [issues, searchTerm, customerFilter, statusFilter, timeFilter]);

  // Function to get customer name by ID
  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return 'Unknown';
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown';
  };

  // Format the date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Issues</h1>
        
        {!showForm && !editingIssue && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Issue
          </button>
        )}
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto text-red-700 hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Search and Filter Bar */}
      {!isLoading && issues.length > 0 && !showForm && !editingIssue && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex-grow">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search issues..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
              >
                <option value="all">All Customers</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            
            <div>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
          
          {/* Show filter result count */}
          <div className="text-sm text-gray-500 mt-3">
            Showing {filteredIssues.length} of {issues.length} issues
          </div>
        </div>
      )}
      
      {/* Issue Form */}
      {(showForm || editingIssue) && (
        <div className="mb-8">
          <IssueForm 
            issue={editingIssue || undefined} 
            customers={customers}
            onSubmit={handleFormSubmit} 
            onCancel={() => {
              setShowForm(false);
              setEditingIssue(null);
            }} 
          />
        </div>
      )}
      
      {/* Issues Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          {issues.length === 0 ? (
            <div className="text-center py-12">
              {issues.length > 0 ? (
                <p className="text-gray-500 text-lg">
                  No issues match your search criteria. Try adjusting your filters.
                </p>
              ) : (
                <p className="text-gray-500 text-lg">No issues found. Create your first issue to get started.</p>
              )}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIssues.map((issue) => (
                  <tr 
                    key={issue.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/issues/${issue.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{issue.title}</div>
                      {issue.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {issue.description.length > 100 ? 
                            `${issue.description.substring(0, 100)}...` : 
                            issue.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {issue.created_by_customer_id ? getCustomerName(issue.created_by_customer_id) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${issue.status === 'open' ? 'bg-red-100 text-red-800' : ''}
                        ${issue.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${issue.status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
                        ${issue.status === 'closed' ? 'bg-gray-100 text-gray-800' : ''}
                      `}>
                        {issue.status ? issue.status.replace('_', ' ') : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${issue.priority === 'low' ? 'bg-blue-100 text-blue-800' : ''}
                        ${issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${issue.priority === 'high' ? 'bg-orange-100 text-orange-800' : ''}
                        ${issue.priority === 'critical' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {issue.priority || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(issue.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {deleteConfirmId === issue.id ? (
                        <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-gray-700">Confirm delete?</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteIssue(issue.id);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Yes
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingIssue(issue);
                              setShowForm(false);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(issue.id);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
