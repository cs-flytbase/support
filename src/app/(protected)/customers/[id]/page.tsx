"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CustomerDetails {
  id: string;
  name: string;
  email: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  customer_type: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerContact {
  id: string;
  customer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  is_primary: boolean;
  metadata: any | null;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  title: string;
  platform_type: string;
  is_group: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

interface Call {
  id: string;
  name: string;
  duration: number;
  meeting_url: string | null;
  recording_url: string | null;
  scheduled_start_time: string | null;
  actual_start_time: string | null;
  end_time: string | null;
  status: string;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
}

interface Participant {
  id: string;
  call_id: string;
  participant_type: string;
  agent_id: string | null;
  name: string;
  role: string;
  joined_at: string | null;
  left_at: string | null;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Customer contacts state
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [contactFormData, setContactFormData] = useState<Partial<CustomerContact>>({
    name: '',
    email: '',
    phone: '',
    title: '',
    is_primary: false
  });
  
  const supabase = createClient();

  // Load customer details
  useEffect(() => {
    async function loadCustomerData() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch customer details
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();
        
        if (customerError) throw customerError;
        if (!customerData) throw new Error('Customer not found');
        
        setCustomer(customerData);
        
        // Fetch customer conversations
        const { data: conversationData, error: conversationError } = await supabase
          .from('conversations')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });
        
        if (conversationError) throw conversationError;
        setConversations(conversationData || []);
        
        // Fetch customer calls
        const { data: callData, error: callError } = await supabase
          .from('calls')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });
        
        if (callError) throw callError;
        setCalls(callData || []);
        
        // Fetch call participants for each call
        if (callData && callData.length > 0) {
          const callIds = callData.map(call => call.id);
          const { data: participantData, error: participantError } = await supabase
            .from('call_participants')
            .select('*')
            .in('call_id', callIds);
          
          if (participantError) throw participantError;
          
          // Group participants by call_id
          const participantsByCall: Record<string, Participant[]> = {};
          participantData?.forEach(participant => {
            if (!participantsByCall[participant.call_id]) {
              participantsByCall[participant.call_id] = [];
            }
            participantsByCall[participant.call_id].push(participant);
          });
          
          setParticipants(participantsByCall);
        }

        // Fetch customer contacts
        await loadCustomerContacts();
      } catch (err: any) {
        console.error('Error loading customer data:', err);
        setError(err.message || 'Failed to load customer data');
      } finally {
        setLoading(false);
      }
    }
    
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId, supabase]);

  // Load customer contacts
  const loadCustomerContacts = async () => {
    setContactsLoading(true);
    setContactsError(null);
    
    try {
      const { data, error } = await supabase
        .from('customer_contacts')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true });
      
      if (error) throw error;
      console.log('Loaded contacts:', data?.length || 0);
      setContacts(data || []);
    } catch (err: any) {
      console.error('Error loading customer contacts:', err);
      setContactsError(err.message || 'Failed to load customer contacts');
    } finally {
      setContactsLoading(false);
    }
  };

  // Handle contact form input change
  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setContactFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setContactFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Reset contact form
  const resetContactForm = () => {
    setContactFormData({
      name: '',
      email: '',
      phone: '',
      title: '',
      is_primary: false
    });
    setEditingContact(null);
    setShowContactForm(false);
  };

  // Create or update contact
  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactFormData.name) {
      alert('Contact name is required');
      return;
    }
    
    try {
      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('customer_contacts')
          .update({
            name: contactFormData.name,
            email: contactFormData.email || null,
            phone: contactFormData.phone || null,
            title: contactFormData.title || null,
            is_primary: contactFormData.is_primary || false,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingContact.id);
          
        if (error) throw error;
      } else {
        // Create new contact
        const { error } = await supabase
          .from('customer_contacts')
          .insert({
            customer_id: customerId,
            name: contactFormData.name,
            email: contactFormData.email || null,
            phone: contactFormData.phone || null,
            title: contactFormData.title || null,
            is_primary: contactFormData.is_primary || false
          });
          
        if (error) throw error;
      }
      
      // Reload contacts
      await loadCustomerContacts();
      resetContactForm();
    } catch (err: any) {
      console.error('Error saving contact:', err);
      setContactsError(err.message || 'Failed to save contact');
    }
  };

  // Edit contact
  const handleEditContact = (contact: CustomerContact) => {
    setEditingContact(contact);
    setContactFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      title: contact.title || '',
      is_primary: contact.is_primary
    });
    setShowContactForm(true);
  };

  // Delete contact
  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('customer_contacts')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Reload contacts
      await loadCustomerContacts();
    } catch (err: any) {
      console.error('Error deleting contact:', err);
      setContactsError(err.message || 'Failed to delete contact');
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  // Format duration in minutes:seconds
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header with back button */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className="text-3xl font-bold">{loading ? 'Loading...' : customer?.name || 'Customer Details'}</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : customer ? (
        <>
          {/* Customer Info Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-lg">{customer.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-lg">
                  {customer.email ? (
                    <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                      {customer.email}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-lg">
                  {customer.phone ? (
                    <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                      {customer.phone}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Website</p>
                <p className="text-lg">
                  {customer.website ? (
                    <a 
                      href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {customer.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer Type</p>
                <p className="text-lg">
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {customer.customer_type?.replace('_', ' ') || 'Not Specified'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Industry</p>
                <p className="text-lg">{customer.industry || 'N/A'}</p>
              </div>
              {customer.address && (
                <div className="md:col-span-2 lg:col-span-3">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-lg">{customer.address}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-lg">{formatDate(customer.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="text-lg">{formatDate(customer.updated_at)}</p>
              </div>
            </div>
          </div>
          
          {/* Tabs for Conversations, Calls and Company Contacts */}
          <Tabs defaultValue="contacts" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
              <TabsTrigger value="conversations">Conversations ({conversations.length})</TabsTrigger>
              <TabsTrigger value="calls">Calls ({calls.length})</TabsTrigger>
            </TabsList>
            
            {/* Contacts Tab */}
            <TabsContent value="contacts">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Customer Contacts</h3>
                  <button
                    onClick={() => {
                      resetContactForm();
                      setShowContactForm(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    Add New Contact
                  </button>
                </div>
                
                {contactsError && (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                    <p>{contactsError}</p>
                  </div>
                )}
                
                {/* Contact Form */}
                {showContactForm && (
                  <div className="p-6 border-b border-gray-200">
                    <h4 className="text-md font-medium mb-4">{editingContact ? 'Edit Contact' : 'Add New Contact'}</h4>
                    <form onSubmit={saveContact} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={contactFormData.name || ''}
                            onChange={handleContactFormChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={contactFormData.email || ''}
                            onChange={handleContactFormChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={contactFormData.phone || ''}
                            onChange={handleContactFormChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Job Title
                          </label>
                          <input
                            type="text"
                            name="title"
                            value={contactFormData.title || ''}
                            onChange={handleContactFormChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_primary"
                          name="is_primary"
                          checked={contactFormData.is_primary || false}
                          onChange={handleContactFormChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_primary" className="ml-2 block text-sm text-gray-900">
                          Primary Contact
                        </label>
                      </div>
                      
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={resetContactForm}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          {editingContact ? 'Update' : 'Create'} Contact
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                {/* Contacts List */}
                {contactsLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading contacts...</p>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p>No contacts found for this customer.</p>
                    <p className="mt-2">
                      <button
                        onClick={() => setShowContactForm(true)}
                        className="text-blue-600 hover:underline"
                      >
                        Add your first contact
                      </button>
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact Info
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {contacts.map((contact) => (
                          <tr key={contact.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                              <div className="text-xs text-gray-500">Added {formatDate(contact.created_at)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {contact.email && (
                                  <div className="mb-1">
                                    <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                                      {contact.email}
                                    </a>
                                  </div>
                                )}
                                {contact.phone && (
                                  <div>
                                    <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                                      {contact.phone}
                                    </a>
                                  </div>
                                )}
                                {!contact.email && !contact.phone && <span className="text-gray-400">No contact info</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{contact.title || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {contact.is_primary && (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Primary Contact
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEditContact(contact)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteContact(contact.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Conversations Tab */}
            <TabsContent value="conversations">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">Conversations</h3>
                </div>
                
                {conversations.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No conversations found for this customer.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Platform
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Message
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {conversations.map((conversation) => (
                          <tr key={conversation.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/conversations/${conversation.id}`)}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{conversation.title || 'Untitled'}</div>
                              <div className="text-sm text-gray-500">{conversation.is_group ? 'Group' : 'Direct'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {conversation.platform_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {conversation.status || 'active'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(conversation.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(conversation.last_message_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/conversations/${conversation.id}`);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Calls Tab */}
            <TabsContent value="calls">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">Calls</h3>
                </div>
                
                {calls.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No calls found for this customer.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Call Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Scheduled Time
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actual Time
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Participants
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {calls.map((call) => (
                          <tr 
                            key={call.id} 
                            className="hover:bg-gray-50 cursor-pointer" 
                            onClick={() => router.push(`/calls/${call.id}`)}>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{call.name || 'Untitled Call'}</div>
                              {call.recording_url && (
                                <div className="text-sm text-gray-500">
                                  <a
                                    href={call.recording_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    Recording
                                  </a>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {call.status || 'completed'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDuration(call.duration)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(call.scheduled_start_time)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(call.actual_start_time)}
                            </td>
                            <td className="px-6 py-4">
                              {participants[call.id] ? (
                                <div className="flex flex-wrap gap-1">
                                  {participants[call.id].map((participant, index) => (
                                    <span key={participant.id} className="px-2 py-1 text-xs rounded-full bg-gray-100">
                                      {participant.name} ({participant.participant_type})
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">No participants data</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p>Customer not found. The customer may have been deleted or you may not have permission to view it.</p>
        </div>
      )}
    </div>
  );
}
