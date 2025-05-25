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
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [contactsError, setContactsError] = useState<string | null>(null);
  
  // Company edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [companyFormData, setCompanyFormData] = useState<Partial<CustomerDetails>>({
    name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    customer_type: '',
    industry: ''
  });
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Customer contacts state
  const [contactsLoading, setContactsLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [contactFormData, setContactFormData] = useState<Partial<CustomerContact>>({
    name: '',
    email: '',
    phone: '',
    title: '',
    is_primary: false,
    customer_id: ''
  });
  
  // State for available companies
  const [availableCompanies, setAvailableCompanies] = useState<CustomerDetails[]>([]);
  
  // Customer edit modal state
  const [showCustomerEditModal, setShowCustomerEditModal] = useState(false);
  const [customerEditData, setCustomerEditData] = useState<Partial<CustomerDetails>>({
    name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    customer_type: '',
    industry: ''
  });
  const [customerEditLoading, setCustomerEditLoading] = useState(false);
  const [selectedContactForEdit, setSelectedContactForEdit] = useState<CustomerContact | null>(null);

  // Reset company form with current customer data
  const resetCompanyForm = (customerData: CustomerDetails) => {
    setCompanyFormData({
      name: customerData.name || '',
      email: customerData.email || '',
      phone: customerData.phone || '',
      website: customerData.website || '',
      address: customerData.address || '',
      customer_type: customerData.customer_type || '',
      industry: customerData.industry || ''
    });
  };
  
  // Handle company form input change
  const handleCompanyFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Save company changes
  const saveCompanyChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyFormData.name) {
      alert('Company name is required');
      return;
    }
    
    setSaveLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: companyFormData.name,
          email: companyFormData.email || null,
          phone: companyFormData.phone || null,
          website: companyFormData.website || null,
          address: companyFormData.address || null,
          customer_type: companyFormData.customer_type || null,
          industry: companyFormData.industry || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);
      
      if (error) throw error;
      
      // Update the local state
      if (customer) {
        const updatedCustomer = {
          ...customer,
          ...companyFormData,
          updated_at: new Date().toISOString()
        };
        setCustomer(updatedCustomer as CustomerDetails);
      }
      
      setShowEditModal(false);
    } catch (err: any) {
      console.error('Error updating company:', err);
      setError(err.message || 'Failed to update company details');
    } finally {
      setSaveLoading(false);
    }
  };
  
  // Load all available companies for the contact form
  const loadAvailableCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, website, phone, address, customer_type, industry, created_at, updated_at')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setAvailableCompanies(data || []);
    } catch (err: any) {
      console.error('Error loading companies:', err);
      // We don't set the error state here to avoid disrupting the main UI
    }
  };

  // Load customer details
  const loadCustomerData = async () => {
    setLoading(true);
    setError(null);
    
    // Load available companies for contact form
    await loadAvailableCompanies();
    
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
      resetCompanyForm(customerData);
      
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
  };

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

  // Load customer data when customerId changes
  useEffect(() => {
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId]);

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
      is_primary: false,
      customer_id: customerId // Default to current customer
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
    
    // Ensure we have a valid customer_id
    const targetCustomerId = contactFormData.customer_id || customerId;
    
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
            customer_id: targetCustomerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingContact.id);
          
        if (error) throw error;
      } else {
        // Create new contact
        const { error } = await supabase
          .from('customer_contacts')
          .insert({
            customer_id: targetCustomerId,
            name: contactFormData.name,
            email: contactFormData.email || null,
            phone: contactFormData.phone || null,
            title: contactFormData.title || null,
            is_primary: contactFormData.is_primary || false
          });
          
        if (error) throw error;
      }
      
      // If contact was moved to another company, we may need to redirect
      if (editingContact && targetCustomerId !== customerId) {
        // Reload the contacts list first
        await loadCustomerContacts();
        resetContactForm();
        
        // Show a success message that the contact was moved
        const targetCompany = availableCompanies.find(c => c.id === targetCustomerId);
        setContactsError(`Contact successfully moved to ${targetCompany?.name || 'another company'}`);
      } else {
        // Regular save - just reload contacts
        await loadCustomerContacts();
        resetContactForm();
      }
    } catch (err: any) {
      console.error('Error saving contact:', err);
      setContactsError(err.message || 'Failed to save contact');
    }
  };

  // Function to open the customer edit modal from a contact
  const openCustomerEditModal = async (contact: CustomerContact) => {
    setSelectedContactForEdit(contact);
    setCustomerEditLoading(true);
    
    // Get target customer ID from contact
    const targetCustomerId = contact.customer_id || customerId;
    
    try {
      // Fetch the customer details
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', targetCustomerId)
        .single();
        
      if (error) throw error;
      
      // Initialize the form with customer data
      setCustomerEditData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        website: data.website || '',
        address: data.address || '',
        customer_type: data.customer_type || '',
        industry: data.industry || ''
      });
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError('Failed to load customer details');
    } finally {
      setCustomerEditLoading(false);
    }
    
    // Show the modal
    setShowCustomerEditModal(true);
  };
  
  // Handle customer edit form change
  const handleCustomerEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomerEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Save customer edit changes
  const saveCustomerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerEditData.name) {
      alert('Company name is required');
      return;
    }
    
    setCustomerEditLoading(true);
    setError(null);
    
    try {
      const targetCustomerId = selectedContactForEdit?.customer_id || customerId;
      
      // Update the customer record
      const { error } = await supabase
        .from('customers')
        .update({
          name: customerEditData.name,
          email: customerEditData.email || null,
          phone: customerEditData.phone || null,
          website: customerEditData.website || null,
          address: customerEditData.address || null,
          customer_type: customerEditData.customer_type || null,
          industry: customerEditData.industry || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetCustomerId);
        
      if (error) throw error;
      
      // Show success message
      setError(`Company details successfully updated${targetCustomerId !== customerId ? ' for another customer' : ''}`);
      
      // Refresh data
      if (targetCustomerId === customerId) {
        // If we updated the current customer, refresh customer data
        await loadCustomerData();
      } else {
        // Otherwise just refresh the companies list
        await loadAvailableCompanies();
      }
      
      // Close the modal
      setShowCustomerEditModal(false);
      setSelectedContactForEdit(null);
    } catch (err: any) {
      console.error('Error updating customer:', err);
      setError(err.message || 'Failed to update customer');
    } finally {
      setCustomerEditLoading(false);
    }
  };
  
  // Traditional Edit contact function (kept for backward compatibility)
  const handleEditContact = (contact: CustomerContact) => {
    setEditingContact(contact);
    setContactFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      title: contact.title || '',
      is_primary: contact.is_primary,
      customer_id: contact.customer_id || customerId
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
      
      {/* Customer Edit Modal */}
      {showCustomerEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">
                Edit Company Information
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedContactForEdit ? `Editing company for contact: ${selectedContactForEdit.name}` : 'Edit company details'}
              </p>
            </div>
            
            <form onSubmit={saveCustomerEdit}>
              <div className="p-6 space-y-4">
                {customerEditLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading company details...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={customerEditData.name || ''}
                          onChange={handleCustomerEditChange}
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
                          value={customerEditData.email || ''}
                          onChange={handleCustomerEditChange}
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
                          value={customerEditData.phone || ''}
                          onChange={handleCustomerEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Website
                        </label>
                        <input
                          type="url"
                          name="website"
                          value={customerEditData.website || ''}
                          onChange={handleCustomerEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={customerEditData.address || ''}
                          onChange={handleCustomerEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Customer Type
                        </label>
                        <select
                          name="customer_type"
                          value={customerEditData.customer_type || ''}
                          onChange={handleCustomerEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select Type</option>
                          <option value="enterprise">Enterprise</option>
                          <option value="mid-market">Mid-Market</option>
                          <option value="smb">Small Business</option>
                          <option value="startup">Startup</option>
                          <option value="individual">Individual</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Industry
                        </label>
                        <select
                          name="industry"
                          value={customerEditData.industry || ''}
                          onChange={handleCustomerEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select Industry</option>
                          <option value="technology">Technology</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="finance">Finance</option>
                          <option value="education">Education</option>
                          <option value="retail">Retail</option>
                          <option value="manufacturing">Manufacturing</option>
                          <option value="entertainment">Entertainment</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCustomerEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={customerEditLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  disabled={customerEditLoading}
                >
                  {customerEditLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : customer ? (
        <>
          {/* Customer Info Card */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
              <h2 className="text-lg sm:text-xl font-semibold">Customer Information</h2>
              <button
                onClick={() => {
                  if (customer) resetCompanyForm(customer);
                  setShowEditModal(true);
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Company
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Name</p>
                <p className="text-base sm:text-lg break-words">{customer.name}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Email</p>
                <p className="text-base sm:text-lg break-words">
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
                <p className="text-xs sm:text-sm text-gray-500">Phone</p>
                <p className="text-base sm:text-lg">
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
                <p className="text-xs sm:text-sm text-gray-500">Website</p>
                <p className="text-base sm:text-lg break-words">
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
                <p className="text-xs sm:text-sm text-gray-500">Customer Type</p>
                <p className="text-base sm:text-lg">
                  <span className="px-2 py-0.5 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {customer.customer_type?.replace('_', ' ') || 'Not Specified'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Industry</p>
                <p className="text-base sm:text-lg">{customer.industry || 'N/A'}</p>
              </div>
              {customer.address && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs sm:text-sm text-gray-500">Address</p>
                  <p className="text-base sm:text-lg break-words">{customer.address}</p>
                </div>
              )}
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Created</p>
                <p className="text-base sm:text-lg">{formatDate(customer.created_at)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Last Updated</p>
                <p className="text-base sm:text-lg">{formatDate(customer.updated_at)}</p>
              </div>
            </div>
          </div>
          
          {/* Edit Company Modal */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Edit Company Details</h3>
                  <button 
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-500 hover:text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={saveCompanyChanges} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={companyFormData.name || ''}
                        onChange={handleCompanyFormChange}
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
                        value={companyFormData.email || ''}
                        onChange={handleCompanyFormChange}
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
                        value={companyFormData.phone || ''}
                        onChange={handleCompanyFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={companyFormData.website || ''}
                        onChange={handleCompanyFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Type
                      </label>
                      <select
                        name="customer_type"
                        value={companyFormData.customer_type || ''}
                        onChange={handleCompanyFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Type</option>
                        <option value="enterprise">Enterprise</option>
                        <option value="mid-market">Mid-Market</option>
                        <option value="smb">Small Business</option>
                        <option value="startup">Startup</option>
                        <option value="individual">Individual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Industry
                      </label>
                      <select
                        name="industry"
                        value={companyFormData.industry || ''}
                        onChange={handleCompanyFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Industry</option>
                        <option value="technology">Technology</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="finance">Finance</option>
                        <option value="education">Education</option>
                        <option value="retail">Retail</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={companyFormData.address || ''}
                        onChange={handleCompanyFormChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                    >
                      {saveLoading && (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
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
                        
                        {/* Company Selection Dropdown */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Company *
                          </label>
                          <select
                            name="customer_id"
                            value={contactFormData.customer_id || customerId}
                            onChange={handleContactFormChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {availableCompanies.map(company => (
                              <option key={company.id} value={company.id}>
                                {company.name} {company.id === customerId ? '(Current)' : ''}
                              </option>
                            ))}
                          </select>
                          {contactFormData.customer_id !== customerId && editingContact && (
                            <p className="mt-1 text-xs text-orange-600">
                              Warning: Changing company will move this contact to another customer.
                            </p>
                          )}
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
                                onClick={() => openCustomerEditModal(contact)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                Edit Customer
                              </button>
                              <button
                                onClick={() => handleEditContact(contact)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                Edit Contact
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
                                    onClick={(e) => e.stopPropagation()}
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