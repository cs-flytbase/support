"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";

// Import components
import { CustomerInfoCard } from "./components/CustomerInfoCard";
import { EditCustomerModal } from "./components/EditCustomerModal";
import { OrganizationSection } from "./components/OrganizationSection";
import { ContactsSection } from "./components/ContactsSection";
import { CommunicationTabs } from "./components/CommunicationTabs";
import { CustomerProfileSection } from "./components/CustomerProfileSection";
import { GoalsSection } from './components/GoalsSection.table';
import { KeyDeliverablesSection } from './components/KeyDeliverablesSection.table';
import { CustomerDashboard } from './components/CustomerDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SummarySection } from './components/SummarySection';
import { BusinessDevSection } from './components/BusinessDevSection';
import { ImmediateNextStepsSection } from './components/ImmediateNextStepsSection';
import { CustomerDashboardCard } from './components/CustomerDashboardCard';
import { useFCSummary } from './fc-summary';

// Import types
import { 
  CustomerDetails, 
  OrgDetails, 
  CustomerContact, 
  Conversation, 
  Call, 
  Participant,
  CustomerGoal,
  KeyDeliverable,
  Deal
} from "./types";

// Utility function to format dates consistently
const formatDate = (date: string | null): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Utility function to format call duration in minutes:seconds
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function CustomerDetailPage() {
  // ...existing hooks and state

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
  const [callsLoading, setCallsLoading] = useState(true);
  const [callsError, setCallsError] = useState<string | null>(null);
  
  // Goals state
  const [goals, setGoals] = useState<CustomerGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  
  // Key deliverables state
  const [deliverables, setDeliverables] = useState<KeyDeliverable[]>([]);
  const [deliverablesLoading, setDeliverablesLoading] = useState(true);
  const [deliverablesError, setDeliverablesError] = useState<string | null>(null);

  // Deals state
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [dealsError, setDealsError] = useState<string | null>(null);

  // FC Summary hook and section (must be after all hooks)
  const partnerOrgId = customer?.partner_org_id;
  const { data: fcSummary, loading: fcLoading, error: fcError } = useFCSummary(partnerOrgId);
  let fcSummarySection = null;
  if (partnerOrgId) {
    if (fcLoading) {
      fcSummarySection = <div className="p-4">Loading FC summary...</div>;
    } else if (fcError || !fcSummary) {
      fcSummarySection = <div className="p-4 text-red-500">Failed to load FC summary.</div>;
    } else {
      fcSummarySection = (
        <SummarySection
          fcRemaining={fcSummary.fcRemaining}
          fcBought={fcSummary.fcBought}
          fcConsumed={fcSummary.fcConsumed}
          fcConsumedMTD={fcSummary.fcConsumedMTD}
          fcConsumedYTD={fcSummary.fcConsumedYTD}
          strategicCustomers={[
            { name: 'Customer 1', docks: 5, arr: 5999 },
            { name: 'Customer 2', docks: 3, arr: 3999 },
            { name: 'Customer 3', docks: 0, arr: 0 },
            { name: 'Customer 4', docks: 0, arr: 0 },
          ]}
          growthEnablers={['Feature requests', 'Technical blockers', 'Support required']}
        />
      );
    }
  }

  
  // Profile updating state
  const [profileSaving, setProfileSaving] = useState(false);
  
  // Organization state
  const [orgs, setOrgs] = useState<OrgDetails[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrgDetails | null>(null);
  const [orgFormData, setOrgFormData] = useState<Partial<OrgDetails>>({
    org_id: '',
    org_name: '',
    customer_id: ''
  });
  
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
  
  // Deals state for the customer
  const [customerDeals, setCustomerDeals] = useState<Array<{name: string, stage: string, closureDate: string, amount: number}>>([]);

  // Customer edit state
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
  const [selectedPrimaryContactId, setSelectedPrimaryContactId] = useState<string | null>(null);

  // Handle primary contact change in edit modal
  const handlePrimaryContactChange = (contactId: string) => {
    setSelectedPrimaryContactId(contactId);
  };

  // Function to set a primary contact
  const setPrimaryContact = async (contactId: string) => {
    try {
      // Step 1: Reset all contacts to not primary
      const { error: resetError } = await supabase
        .from('customer_contacts')
        .update({ is_primary: false })
        .eq('customer_id', customerId);
        
      if (resetError) throw resetError;
      
      // Step 2: Set the selected contact as primary
      const { error: updateError } = await supabase
        .from('customer_contacts')
        .update({ is_primary: true })
        .eq('id', contactId);
      
      if (updateError) throw updateError;
      
      // Step 3: Update the customer record with the primary_contact_id
      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({ primary_contact_id: contactId })
        .eq('id', customerId);
        
      if (customerUpdateError) throw customerUpdateError;
      
      // Step 4: Update the local state
      if (customer) {
        setCustomer({
          ...customer,
          primary_contact_id: contactId
        });
      }
      
      // Reload contacts
      await loadCustomerContacts();
      
      // Show success notification
      alert('Primary contact updated successfully');
    } catch (err) {
      console.error('Error setting primary contact:', err);
      alert('Failed to update primary contact');
    }
  };

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
    // Initialize the primary contact ID if available
    setSelectedPrimaryContactId(customerData.primary_contact_id || null);
  };
  
  // Handle company form input change
  const handleCompanyFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Save company changes
  const saveCompanyChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    
    try {
      // First update the customer details - omitting primary_contact_id until column is added
      const { error } = await supabase
        .from('customers')
        .update({
          name: companyFormData.name,
          website: companyFormData.website || null,
          address: companyFormData.address || null,
          customer_type: companyFormData.customer_type || null,
          industry: companyFormData.industry || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);
      
      if (error) throw error;
      
      // Check if primary contact has changed
      if (selectedPrimaryContactId && selectedPrimaryContactId !== customer?.primary_contact_id) {
        // Reset all contacts to not primary
        const { error: resetError } = await supabase
          .from('customer_contacts')
          .update({ is_primary: false })
          .eq('customer_id', customerId);
          
        if (resetError) throw resetError;
        
        // Set the selected contact as primary
        const { error: updateError } = await supabase
          .from('customer_contacts')
          .update({ is_primary: true })
          .eq('id', selectedPrimaryContactId);
        
        if (updateError) throw updateError;
      }
      
      // Update the local state
      if (customer) {
        const updatedCustomer = {
          ...customer,
          ...companyFormData,
          primary_contact_id: selectedPrimaryContactId,
          updated_at: new Date().toISOString()
        };
        setCustomer(updatedCustomer as CustomerDetails);
      }
      
      // Reload contacts to ensure they reflect any primary contact changes
      await loadCustomerContacts();
      
      // Close the modal
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
        .select('id, name, email, website, phone, address, country, region, customer_type, industry, customer_profile, customer_profile_update_time, created_at, updated_at')
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
      // Fetch customer details - explicitly include all fields we need including business development metrics
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select(`
          id, name, email, phone, website, address, country, region, 
          partner_org_id, customer_type, industry, primary_contact_id, 
          customer_profile, customer_profile_update_time, 
          call_sentiment_score, created_at, updated_at,
          closed_won, 
          Contracted, 
          totalPipelineAmount, 
          Weighted_Pipeline
        `)
        .eq('id', customerId)
        .single();
      
      if (customerError) throw customerError;
      if (!customerData) throw new Error('Customer not found');
      
      setCustomer(customerData);
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
      loadDeals();
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

  // Load organization data
  const loadOrganizationData = async () => {
    setOrgsLoading(true);
    setOrgsError(null);
    
    try {
      const { data, error } = await supabase
        .from('org')
        .select('*')
        .eq('customer_id', customerId);
      
      if (error) throw error;
      setOrgs(data || []);
    } catch (err: any) {
      console.error('Error loading organization data:', err);
      setOrgsError(err.message || 'Failed to load organization data');
    } finally {
      setOrgsLoading(false);
    }
  };
  
  // Load customer calls
  const loadCalls = async () => {
    try {
      // Don't set calls to empty array and then immediately load
      // Only reset calls if we're in a fresh load
      if (!calls.length) {
        setCallsLoading(true);
      }
      
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('customer_id', customerId)
        .order('actual_start_time', { ascending: false });

      if (error) throw error;
      
      // Only update state if we have new data
      if (data) {
        setCalls(data);
        
        // Update customer's last call date if calls exist and we have customer data
        if (data.length > 0 && customer) {
          const lastCallDate = data[0].actual_start_time || data[0].created_at;
          
          // Only update customer in state if the date is different
          if (customer.last_call_date !== lastCallDate) {
            setCustomer({
              ...customer,
              last_call_date: lastCallDate
            });
            
            // Update the database to store this last call date
            // This ensures the last_call_date is accurate even if the calls are loaded separately
            await supabase
              .from('customers')
              .update({ last_call_date: lastCallDate })
              .eq('id', customerId);
          }
        }
      }
    } catch (err) {
      console.error('Error loading calls:', err);
      setCallsError('Failed to load call history');
    } finally {
      setCallsLoading(false);
    }
  };

  // Load customer goals
  const loadGoals = async () => {
    setGoalsLoading(true);
    setGoalsError(null);
    
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setGoals(data || []);
    } catch (err: any) {
      console.error('Error loading goals:', err);
      setGoalsError(err.message || 'Failed to load customer goals');
    } finally {
      setGoalsLoading(false);
    }
  };
  
  // Load key deliverables
  const loadKeyDeliverables = async () => {
    setDeliverablesLoading(true);
    setDeliverablesError(null);
    
    try {
      const { data, error } = await supabase
        .from('key_deliverables')
        .select('*')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setDeliverables(data || []);
    } catch (err: any) {
      console.error('Error loading deliverables:', err);
      setDeliverablesError(err.message || 'Failed to load key deliverables');
    } finally {
      setDeliverablesLoading(false);
    }
  };
  
  // Load deals for customer
  const loadDeals = async () => {
    setDealsLoading(true);
    setDealsError(null);
    try {
      const response = await fetch(`/api/deals/${customerId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(data);
      setDeals(data.deals || []);
    } catch (err: any) {
      console.error('Error loading deals:', err);
      setDealsError(err.message || 'Failed to load deals');
    } finally {
      setDealsLoading(false);
    }
  };
  
  // Update customer profile
  const updateCustomerProfile = async (profileText: string) => {
    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          customer_profile: profileText,
          // The database trigger will update customer_profile_update_time automatically
        })
        .eq('id', customerId);
        
      if (error) throw error;
      
      // Update local state
      if (customer) {
        setCustomer({
          ...customer,
          customer_profile: profileText,
          customer_profile_update_time: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error('Error updating customer profile:', err);
      setError(err.message || 'Failed to update customer profile');
      throw err; // Re-throw to be caught by the component
    } finally {
      setProfileSaving(false);
    }
  };
  
  // Add a new goal
  const addGoal = async (goalText: string, priority: string, status: string, agentName?: string) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .insert([{
          customer_id: customerId,
          goal_text: goalText,
          priority: priority,
          status: status,
          assigned_agent_name: agentName || null
        }])
        .select();
        
      if (error) throw error;
      
      // Update local state
      if (data && data.length > 0) {
        setGoals(prevGoals => [data[0], ...prevGoals]);
      }
    } catch (err: any) {
      console.error('Error adding goal:', err);
      setGoalsError(err.message || 'Failed to add goal');
      throw err;
    }
  };
  
  // Update an existing goal
  const updateGoal = async (goalId: string, goalText: string, priority?: string, status?: string, agentName?: string) => {
    try {
      const updateData: any = {
        goal_text: goalText,
        updated_at: new Date().toISOString()
      };
      
      // Add optional fields if provided
      if (priority !== undefined) {
        updateData.priority = priority;
      }
      
      if (status !== undefined) {
        updateData.status = status;
      }
      
      if (agentName !== undefined) {
        updateData.assigned_agent_name = agentName || null;
      }
      
      const { error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', goalId);
        
      if (error) throw error;
      
      // Update local state
      setGoals(prevGoals => prevGoals.map(goal => 
        goal.id === goalId 
          ? { 
              ...goal, 
              goal_text: goalText, 
              priority: priority !== undefined ? priority : goal.priority,
              status: status !== undefined ? status : goal.status,
              assigned_agent_name: agentName !== undefined ? agentName : goal.assigned_agent_name,
              updated_at: new Date().toISOString() 
            }
          : goal
      ));
    } catch (err: any) {
      console.error('Error updating goal:', err);
      setGoalsError(err.message || 'Failed to update goal');
      throw err;
    }
  };
  
  // Delete a goal
  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);
        
      if (error) throw error;
      
      // Update local state
      setGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
    } catch (err: any) {
      console.error('Error deleting goal:', err);
      setGoalsError(err.message || 'Failed to delete goal');
    }
  };
  
  // Add a new key deliverable
  const addKeyDeliverable = async (deliverableText: string, isEditable: boolean, priority: string, status: string, agentName?: string) => {
    try {
      const { data, error } = await supabase
        .from('key_deliverables')
        .insert([{
          customer_id: customerId,
          deliverable_text: deliverableText,
          is_editable: isEditable,
          priority: priority,
          status: status,
          assigned_agent_name: agentName || null
        }])
        .select();
        
      if (error) throw error;
      
      // Update local state
      if (data && data.length > 0) {
        setDeliverables(prevDeliverables => [data[0], ...prevDeliverables]);
      }
    } catch (err: any) {
      console.error('Error adding deliverable:', err);
      setDeliverablesError(err.message || 'Failed to add deliverable');
      throw err;
    }
  };
  
  // Update an existing deliverable
  const updateKeyDeliverable = async (deliverableId: string, deliverableText: string, priority?: string, status?: string, agentName?: string) => {
    try {
      const updateData: any = {
        deliverable_text: deliverableText,
        updated_at: new Date().toISOString()
      };
      
      // Add priority and status to update data if provided
      if (priority !== undefined) {
        updateData.priority = priority;
      }
      
      if (status !== undefined) {
        updateData.status = status;
      }
      
      // Add agent name if provided
      if (agentName !== undefined) {
        updateData.assigned_agent_name = agentName || null;
      }
      
      const { error } = await supabase
        .from('key_deliverables')
        .update(updateData)
        .eq('id', deliverableId);
        
      if (error) throw error;
      
      // Update local state
      setDeliverables(prevDeliverables => prevDeliverables.map(deliverable => 
        deliverable.id === deliverableId 
          ? { 
              ...deliverable, 
              deliverable_text: deliverableText, 
              priority: priority !== undefined ? priority : deliverable.priority,
              status: status !== undefined ? status : deliverable.status,
              assigned_agent_name: agentName !== undefined ? agentName : deliverable.assigned_agent_name,
              updated_at: new Date().toISOString() 
            }
          : deliverable
      ));
    } catch (err: any) {
      console.error('Error updating deliverable:', err);
      setDeliverablesError(err.message || 'Failed to update deliverable');
      throw err;
    }
  };
  
  // Delete a deliverable
  const deleteKeyDeliverable = async (deliverableId: string) => {
    if (!confirm('Are you sure you want to delete this deliverable?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('key_deliverables')
        .delete()
        .eq('id', deliverableId);
        
      if (error) throw error;
      
      // Update local state
      setDeliverables(prevDeliverables => prevDeliverables.filter(deliverable => deliverable.id !== deliverableId));
    } catch (err: any) {
      console.error('Error deleting deliverable:', err);
      setDeliverablesError(err.message || 'Failed to delete deliverable');
    }
  };

  // Handle org form input change
  const handleOrgFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOrgFormData(prev => ({ ...prev, [name]: value }));
  };

  // Reset org form
  const resetOrgForm = () => {
    setOrgFormData({
      org_id: '',
      org_name: '',
      customer_id: customerId
    });
    setEditingOrg(null);
    setShowOrgForm(false);
  };

  // Create or update organization
  const saveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgFormData.org_id || !orgFormData.org_name) {
      alert('Organization ID and name are required');
      return;
    }
    
    try {
      // First check if the org_id already exists (for new orgs)
      if (!editingOrg) {
        const { data: existingOrg, error: checkError } = await supabase
          .from('org')
          .select('org_id')
          .eq('org_id', orgFormData.org_id)
          .maybeSingle();

        if (checkError) throw checkError;
        
        // If org_id already exists, show a specific error message
        if (existingOrg) {
          setOrgsError(`Organization ID '${orgFormData.org_id}' already exists. Please use a different ID.`);
          return;
        }
      }
      
      if (editingOrg) {
        // Check if we're changing the org_id and if so, ensure it doesn't conflict
        if (editingOrg.org_id !== orgFormData.org_id) {
          const { data: existingOrg, error: checkError } = await supabase
            .from('org')
            .select('org_id')
            .eq('org_id', orgFormData.org_id)
            .maybeSingle();
  
          if (checkError) throw checkError;
          
          // If org_id already exists, show a specific error message
          if (existingOrg) {
            setOrgsError(`Organization ID '${orgFormData.org_id}' already exists. Please use a different ID.`);
            return;
          }
        }
        
        // Update existing organization
        const { error } = await supabase
          .from('org')
          .update({
            org_id: orgFormData.org_id,
            org_name: orgFormData.org_name,
            updated_at: new Date().toISOString()
          })
          .eq('org_id', editingOrg.org_id);
          
        if (error) throw error;
      } else {
        // Create new organization
        const { error } = await supabase
          .from('org')
          .insert({
            org_id: orgFormData.org_id,
            org_name: orgFormData.org_name,
            customer_id: customerId
          });
          
        if (error) throw error;
      }
      
      // Reload orgs list
      await loadOrganizationData();
      resetOrgForm();
      setOrgsError(null); // Clear any previous errors on success
    } catch (err: any) {
      console.error('Error saving organization:', err);
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        setOrgsError(`Organization ID '${orgFormData.org_id}' already exists. Please use a different ID.`);
      } else {
        setOrgsError(err.message || 'Failed to save organization');
      }
    }
  };

  // Edit organization
  const handleEditOrg = (org: OrgDetails) => {
    setEditingOrg(org);
    setOrgFormData({
      org_id: org.org_id,
      org_name: org.org_name,
      customer_id: org.customer_id
    });
    setShowOrgForm(true);
  };

  // Delete organization
  const handleDeleteOrg = async (orgId: string) => {
    if (!confirm('Are you sure you want to delete this organization ID?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('org')
        .delete()
        .eq('org_id', orgId);
        
      if (error) throw error;
      
      // Reload orgs
      await loadOrganizationData();
    } catch (err: any) {
      console.error('Error deleting organization:', err);
      setOrgsError(err.message || 'Failed to delete organization');
    }
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
        <div className="space-y-8">
          {/* Master Section - Major Customer Details */}
          <CustomerDashboardCard
            customer={customer}
            contacts={contacts}
            deals={deals}
            dealsLoading={dealsLoading}
            dealsError={dealsError}
            fcSummarySection={fcSummarySection}
          />

          {/* Tabbed Interface */}
      
          
          {/* Customer Edit Modal */}
          <EditCustomerModal 
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            contacts={contacts}
            primaryContactId={selectedPrimaryContactId || (customer ? customer.primary_contact_id : null) || null}
            onPrimaryContactChange={handlePrimaryContactChange}
            formData={companyFormData}
            onChange={handleCompanyFormChange}
            onSubmit={saveCompanyChanges}
            isLoading={saveLoading}
          />
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-xl text-gray-500">Customer not found</p>
          <button
            onClick={() => router.push('/customers')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Customers List
          </button>
        </div>
      )}
    </div>
  );
}