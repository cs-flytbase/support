"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Types for our data
type Issue = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  issue_type: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
  created_by_customer_id: string | null;
  first_identified: string | null;
  resolved_at: string | null;
  mentioned_context: string | null;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  customer_type: string | null;
};

type CustomerIssue = {
  id: string;
  issue_id: string;
  customer_id: string;
  customer_status: string | null;
  customer_priority: string | null;
  business_impact: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  is_blocking: boolean | null;
  created_at: string;
};

type CallMention = {
  id: string;
  call_id: string;
  issue_id: string;
  customer_id: string;
  mentioned_by: string | null;
  mention_context: string | null;
  mentioned_context: string | null;
  mention_timestamp: number | null;
  timestamp: string | null;
  sentiment: string | null;
  urgency_level: string | null;
  urgency: string | null;
  importance: string | null;
  customer_reason: string | null;
  customer_use_case: string | null;
  created_at: string;
  // UI helper fields
  call_title?: string;
  customer_name?: string;
  call_date?: string;
};

// Define proper props type for Next.js App Router
type PageProps = {
  params: Promise<{ id: string }>
};

export default function IssueDetailPage({ params }: PageProps) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerIssues, setCustomerIssues] = useState<CustomerIssue[]>([]);
  const [callMentions, setCallMentions] = useState<CallMention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issueId, setIssueId] = useState<string>('');
  const [editingCallMention, setEditingCallMention] = useState<CallMention | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();
  
  // Extract the ID from params when the component mounts
  useEffect(() => {
    // Handle params as a Promise
    Promise.resolve(params).then((resolvedParams) => {
      if (resolvedParams && typeof resolvedParams === 'object' && 'id' in resolvedParams) {
        setIssueId(resolvedParams.id);
      }
    }).catch(error => {
      console.error('Error resolving params:', error);
    });
  }, [params]);

  // Load issue details and related data
  useEffect(() => {
    // Only proceed if we have a valid issueId
    if (!issueId) return;
    const loadIssueData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch the issue
        const { data: issueData, error: issueError } = await supabase
          .from('issues')
          .select('*')
          .eq('id', issueId)
          .single();
        
        if (issueError) throw issueError;
        if (!issueData) throw new Error('Issue not found');
        
        setIssue(issueData);
        
        // Fetch customer issues for this issue
        const { data: ciData, error: ciError } = await supabase
          .from('customer_issues')
          .select('*')
          .eq('issue_id', issueId);
        
        if (ciError) throw ciError;
        setCustomerIssues(ciData || []);
        
        // Get unique customer IDs
        const customerIds = [...new Set([
          ...(ciData || []).map(ci => ci.customer_id),
          issueData.created_by_customer_id
        ].filter(Boolean))];
        
        // Fetch customer details if we have customer IDs
        if (customerIds.length > 0) {
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .in('id', customerIds);
          
          if (customerError) throw customerError;
          setCustomers(customerData || []);
        }
        
        // Fetch call mentions for this issue with comprehensive details
        const { data: callMentionsRaw, error: callMentionError } = await supabase
          .from('issue_call_mentions')
          .select('*')
          .eq('issue_id', issueId)
          .order('created_at', { ascending: false });
        
        if (callMentionError) throw callMentionError;
        
        // Fetch call details for each mention
        if (callMentionsRaw && callMentionsRaw.length > 0) {
          const callIds = callMentionsRaw.map(cm => cm.call_id);
          const { data: callsData, error: callsError } = await supabase
            .from('calls')
            .select('id, name, customer_id, actual_start_time, recording_url, duration')
            .in('id', callIds);
          
          if (callsError) throw callsError;
          
          // Get all unique customer IDs from calls only (since issue_call_mentions no longer has customer_id)
          const callCustomerIds = (callsData || [])
            .map(call => call.customer_id)
            .filter(Boolean);
          
          let callCustomers: any[] = [];
          
          if (callCustomerIds.length > 0) {
            const { data: callCustomerData, error: callCustomerError } = await supabase
              .from('customers')
              .select('id, name')
              .in('id', callCustomerIds);
            
            if (callCustomerError) throw callCustomerError;
            callCustomers = callCustomerData || [];
          }
          
          // Combine call mention data with call details and customer names
          // Get customer info ONLY from calls since issue_call_mentions.customer_id no longer exists
          const enrichedCallMentions = callMentionsRaw.map(mention => {
            const call = callsData?.find(c => c.id === mention.call_id);
            
            // Get customer from the call
            let customer = null;
            if (call?.customer_id) {
              customer = callCustomers.find(c => c.id === call.customer_id);
            }
            
            return {
              ...mention,
              call_title: call?.name || 'Unknown Call',
              customer_name: customer?.name || 'Unknown Customer',
              call_date: call?.actual_start_time || null
            };
          });
          
          setCallMentions(enrichedCallMentions);
        } else {
          setCallMentions([]);
        }
      } catch (err: any) {
        console.error('Error loading issue data:', err);
        setError(err.message || 'Failed to load issue data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadIssueData();
  }, [issueId, supabase]);
  
  // Format the date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Get a customer's name by ID
  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return 'Unknown';
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown';
  };
  
  // Handle back button click
  const handleBack = () => {
    router.push('/issues');
  };
  
  // Navigate to a call
  const navigateToCall = (callId: string) => {
    router.push(`/calls/${callId}`);
  };
  
  // Navigate to a customer
  const navigateToCustomer = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };

  // Open edit modal for a call mention
  const openEditModal = (mention: CallMention, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to call
    setEditingCallMention(mention);
    setSelectedCustomerId(mention.customer_id);
    setIsEditModalOpen(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCallMention(null);
    setSelectedCustomerId('');
  };

  // Update call mention customer
  const updateCallMentionCustomer = async () => {
    if (!editingCallMention || !selectedCustomerId) return;
    
    setIsUpdating(true);
    try {
      // Update the call mention in the database
      const { error: updateError } = await supabase
        .from('issue_call_mentions')
        .update({ customer_id: selectedCustomerId })
        .eq('id', editingCallMention.id);
      
      if (updateError) throw updateError;
      
      // Get updated customer info
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('id', selectedCustomerId)
        .single();
      
      if (customerError) throw customerError;
      
      // Update local state
      setCallMentions(prevMentions => 
        prevMentions.map(mention => 
          mention.id === editingCallMention.id 
            ? { 
                ...mention, 
                customer_id: selectedCustomerId,
                customer_name: customerData.name 
              } 
            : mention
        )
      );
      
      toast.success('Call mention updated successfully');
      closeEditModal();
    } catch (err: any) {
      console.error('Error updating call mention:', err);
      toast.error(err.message || 'Failed to update call mention');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Get styling based on sentiment
  const getSentimentStyle = (sentiment: string | null) => {
    if (!sentiment) return 'bg-gray-100 text-gray-800';
    
    switch(sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'neutral':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get styling based on urgency
  const getUrgencyStyle = (urgency: string | null) => {
    if (!urgency) return 'bg-gray-100 text-gray-800';
    
    switch(urgency.toLowerCase()) {
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (error || !issue) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error || 'Issue not found'}</p>
          <button 
            onClick={handleBack} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Back to Issues
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      {/* Header with back button */}
      <div className="flex flex-wrap items-center mb-4 sm:mb-6">
        <button
          onClick={handleBack}
          className="mr-3 sm:mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">{issue.title}</h1>
      </div>
      
      {/* Issue details card */}
      <div className="bg-white rounded-lg shadow-md mb-6 sm:mb-8 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start">
            <div className="mb-4 lg:mb-0">
              <h2 className="text-xl sm:text-2xl font-semibold mb-2">Issue Details</h2>
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold 
                  ${issue.status === 'open' ? 'bg-red-100 text-red-800' : ''}
                  ${issue.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${issue.status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
                  ${issue.status === 'closed' ? 'bg-gray-100 text-gray-800' : ''}
                `}>
                  Status: {issue.status ? issue.status.replace('_', ' ') : 'Unknown'}
                </span>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold 
                  ${issue.priority === 'low' ? 'bg-blue-100 text-blue-800' : ''}
                  ${issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${issue.priority === 'high' ? 'bg-orange-100 text-orange-800' : ''}
                  ${issue.priority === 'critical' ? 'bg-red-100 text-red-800' : ''}
                `}>
                  Priority: {issue.priority || 'Unknown'}
                </span>
                {issue.category && (
                  <span className="px-2 sm:px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs sm:text-sm font-semibold">
                    Category: {issue.category}
                  </span>
                )}
                {issue.issue_type && (
                  <span className="px-2 sm:px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs sm:text-sm font-semibold">
                    Type: {issue.issue_type.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500 lg:text-right">
              <div>Created: {formatDate(issue.created_at)}</div>
              <div>Last Updated: {formatDate(issue.updated_at)}</div>
              {issue.first_identified && (
                <div>First Identified: {formatDate(issue.first_identified)}</div>
              )}
              {issue.resolved_at && (
                <div>Resolved: {formatDate(issue.resolved_at)}</div>
              )}
            </div>
          </div>
          
          {/* Description */}
          {issue.description && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-line">{issue.description}</p>
            </div>
          )}
          
          {/* Mentioned Context */}
          {issue.mentioned_context && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Mentioned Context</h3>
              <p className="text-gray-700 whitespace-pre-line bg-gray-50 p-4 rounded-md">{issue.mentioned_context}</p>
            </div>
          )}
        </div>
        
        {/* Associated Customers */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold mb-4">Associated Customers</h3>
          
          {customers.length === 0 ? (
            <p className="text-gray-500">No customers associated with this issue.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {customers.map(customer => (
                <div 
                  key={customer.id} 
                  className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigateToCustomer(customer.id)}
                >
                  <div className="font-medium text-lg">{customer.name}</div>
                  <div className="text-sm">
                    {customer.email && (
                      <div className="text-gray-600" onClick={(e) => e.stopPropagation()}>
                        <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                          {customer.email}
                        </a>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="text-gray-600" onClick={(e) => e.stopPropagation()}>
                        <a href={`tel:${customer.phone}`} className="hover:underline">
                          {customer.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {/* Customer issue details if available */}
                  {customerIssues.filter(ci => ci.customer_id === customer.id).map(ci => (
                    <div key={ci.id} className="mt-2 text-sm">
                      {ci.customer_status && (
                        <span className="mr-2 px-2 py-1 bg-gray-100 rounded-md">
                          Status: {ci.customer_status}
                        </span>
                      )}
                      {ci.customer_priority && (
                        <span className="mr-2 px-2 py-1 bg-gray-100 rounded-md">
                          Priority: {ci.customer_priority}
                        </span>
                      )}
                      {ci.is_blocking && (
                        <span className="mr-2 px-2 py-1 bg-red-100 text-red-800 rounded-md">
                          Blocking
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Call Mentions */}
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">Call Mentions</h3>
          
          {callMentions.length === 0 ? (
            <p className="text-gray-500">No call mentions found for this issue.</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {callMentions.map(mention => (
                <div 
                  key={mention.id} 
                  className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigateToCall(mention.call_id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{mention.call_title}</div>
                      <div className="flex items-center">
                        <div className="text-sm text-gray-600 mr-2">Customer: {mention.customer_name}</div>
                        <button 
                          onClick={(e) => openEditModal(mention, e)}
                          className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded-md"
                        >
                          Edit
                        </button>
                      </div>
                      {mention.mentioned_by && (
                        <div className="text-sm text-gray-600">Mentioned by: {mention.mentioned_by}</div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {mention.call_date ? formatDate(mention.call_date) : 
                       (mention.timestamp ? formatDate(mention.timestamp) : formatDate(mention.created_at))}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {mention.sentiment && (
                      <span className={`px-2 py-1 text-xs rounded-full ${getSentimentStyle(mention.sentiment)}`}>
                        Sentiment: {mention.sentiment}
                      </span>
                    )}
                    {(mention.urgency_level || mention.urgency) && (
                      <span className={`px-2 py-1 text-xs rounded-full ${getUrgencyStyle(mention.urgency_level || mention.urgency)}`}>
                        Urgency: {mention.urgency_level || mention.urgency}
                      </span>
                    )}
                    {mention.importance && (
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        Importance: {mention.importance}
                      </span>
                    )}
                  </div>
                  
                  {mention.mention_context && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-1">Mention Context:</h4>
                      <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-md whitespace-pre-line">
                        {mention.mention_context}
                      </p>
                    </div>
                  )}
                  
                  {mention.mentioned_context && mention.mentioned_context !== mention.mention_context && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-1">Mentioned Context:</h4>
                      <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-md whitespace-pre-line">
                        {mention.mentioned_context}
                      </p>
                    </div>
                  )}
                  
                  {mention.customer_reason && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-1">Customer Reason:</h4>
                      <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-md whitespace-pre-line">
                        {mention.customer_reason}
                      </p>
                    </div>
                  )}
                  
                  {mention.customer_use_case && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-1">Customer Use Case:</h4>
                      <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-md whitespace-pre-line">
                        {mention.customer_use_case}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Call Mention Modal */}
      {isEditModalOpen && editingCallMention && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Edit Call Mention</h3>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">Call: {editingCallMention.call_title}</p>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUpdating}
              >
                <option value="">Select a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={updateCallMentionCustomer}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={isUpdating || !selectedCustomerId}
              >
                {isUpdating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating
                  </span>
                ) : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
