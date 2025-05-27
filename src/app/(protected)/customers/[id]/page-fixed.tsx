"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";

// Import our layout component
import CustomerLayout from "./customer-layout";

// Import types
import { 
  CustomerDetails, 
  OrgDetails, 
  CustomerContact, 
  Conversation, 
  Call, 
  Participant,
  CustomerGoal,
  KeyDeliverable
} from "./types";

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
  
  // Goals state
  const [goals, setGoals] = useState<CustomerGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  
  // Key deliverables state
  const [deliverables, setDeliverables] = useState<KeyDeliverable[]>([]);
  const [deliverablesLoading, setDeliverablesLoading] = useState(true);
  const [deliverablesError, setDeliverablesError] = useState<string | null>(null);
  
  // Organizations state
  const [orgs, setOrgs] = useState<OrgDetails[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgFormData, setOrgFormData] = useState<Partial<OrgDetails>>({
    customer_id: customerId
  });
  const [editingOrg, setEditingOrg] = useState<OrgDetails | null>(null);
  
  // Contacts state
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactFormData, setContactFormData] = useState<Partial<CustomerContact>>({
    customer_id: customerId
  });
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  
  // Edit customer modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<Partial<CustomerDetails>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  
  // For contact form - list of available companies
  const [availableCompanies, setAvailableCompanies] = useState<CustomerDetails[]>([]);
  
  // Data loading functions
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load customer details
        const { data: customerData, error: customerError } = await supabase
          .from('customer')
          .select('*')
          .eq('id', customerId)
          .single();
          
        if (customerError) throw customerError;
        
        if (customerData) {
          setCustomer(customerData as CustomerDetails);
          
          // Load contacts for this customer
          await loadContactsData();
          
          // Load communication data
          await loadCommunicationData();
          
          // Load goals data
          await loadGoalsData();
          
          // Load key deliverables
          await loadDeliverablesData();
          
          // Load organization data
          await loadOrganizationData();
          
          // Load available companies for contact form
          await loadAvailableCompanies();
        } else {
          setError('Customer not found');
        }
      } catch (err: any) {
        console.error('Error loading customer data:', err);
        setError(err.message || 'Failed to load customer data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [customerId, supabase]);
  
  // Load customer contacts
  const loadContactsData = async () => {
    setContactsError(null);
    
    try {
      const { data: contactsData, error: contactsError } = await supabase
        .from('contact')
        .select('*')
        .eq('customer_id', customerId);
        
      if (contactsError) throw contactsError;
      
      setContacts(contactsData as CustomerContact[]);
    } catch (err: any) {
      console.error('Error loading contacts:', err);
      setContactsError(err.message || 'Failed to load contacts');
    }
  };
  
  // Load communication data (conversations and calls)
  const loadCommunicationData = async () => {
    try {
      // Load conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversation')
        .select('*')
        .eq('customer_id', customerId);
        
      if (conversationsError) throw conversationsError;
      
      setConversations(conversationsData as Conversation[]);
      
      // Load calls
      const { data: callsData, error: callsError } = await supabase
        .from('call')
        .select('*')
        .eq('customer_id', customerId);
        
      if (callsError) throw callsError;
      
      setCalls(callsData as Call[]);
      
      // Load participants for conversations and calls
      const allCommIds = [
        ...conversationsData.map(c => c.id),
        ...callsData.map(c => c.id)
      ];
      
      if (allCommIds.length > 0) {
        const { data: participantsData, error: participantsError } = await supabase
          .from('participant')
          .select('*')
          .in('communication_id', allCommIds);
          
        if (participantsError) throw participantsError;
        
        // Group participants by communication ID
        const participantsByCommId: Record<string, Participant[]> = {};
        
        (participantsData as Participant[]).forEach(participant => {
          const commId = participant.communication_id;
          if (!participantsByCommId[commId]) {
            participantsByCommId[commId] = [];
          }
          participantsByCommId[commId].push(participant);
        });
        
        setParticipants(participantsByCommId);
      }
    } catch (err: any) {
      console.error('Error loading communication data:', err);
      // We don't set an error state for communication data as it's not critical
    }
  };
  
  // Load goals data
  const loadGoalsData = async () => {
    setGoalsLoading(true);
    setGoalsError(null);
    
    try {
      const { data: goalsData, error: goalsError } = await supabase
        .from('goal')
        .select('*')
        .eq('customer_id', customerId);
        
      if (goalsError) throw goalsError;
      
      setGoals(goalsData as CustomerGoal[]);
    } catch (err: any) {
      console.error('Error loading goals:', err);
      setGoalsError(err.message || 'Failed to load goals');
    } finally {
      setGoalsLoading(false);
    }
  };
  
  // Load key deliverables data
  const loadDeliverablesData = async () => {
    setDeliverablesLoading(true);
    setDeliverablesError(null);
    
    try {
      const { data: deliverablesData, error: deliverablesError } = await supabase
        .from('key_deliverable')
        .select('*')
        .eq('customer_id', customerId);
        
      if (deliverablesError) throw deliverablesError;
      
      setDeliverables(deliverablesData as KeyDeliverable[]);
    } catch (err: any) {
      console.error('Error loading key deliverables:', err);
      setDeliverablesError(err.message || 'Failed to load key deliverables');
    } finally {
      setDeliverablesLoading(false);
    }
  };
  
  // Load organization data
  const loadOrganizationData = async () => {
    setOrgsLoading(true);
    setOrgsError(null);
    
    try {
      const { data: orgsData, error: orgsError } = await supabase
        .from('org')
        .select('*')
        .eq('customer_id', customerId);
        
      if (orgsError) throw orgsError;
      
      setOrgs(orgsData as OrgDetails[]);
    } catch (err: any) {
      console.error('Error loading organizations:', err);
      setOrgsError(err.message || 'Failed to load organizations');
    } finally {
      setOrgsLoading(false);
    }
  };
  
  // Load available companies for contact form
  const loadAvailableCompanies = async () => {
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from('customer')
        .select('id, name');
        
      if (companiesError) throw companiesError;
      
      setAvailableCompanies(companiesData as CustomerDetails[]);
    } catch (err: any) {
      console.error('Error loading available companies:', err);
      // Not setting an error state as this is not critical
    }
  };
  
  // Format a date for display
  const formatDate = (date: string | null): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format duration in seconds to a readable format
  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return 'N/A';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Customer Profile functions
  const updateCustomerProfile = async (profileText: string) => {
    if (!customer) return;
    
    try {
      const { error } = await supabase
        .from('customer')
        .update({ profile: profileText })
        .eq('id', customer.id);
        
      if (error) throw error;
      
      // Update the customer state with new profile
      setCustomer(prev => prev ? { ...prev, profile: profileText } : null);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile: ' + err.message);
    }
  };
  
  // Goals functions
  const addGoal = async (goalText: string) => {
    try {
      const { data, error } = await supabase
        .from('goal')
        .insert({
          customer_id: customerId,
          description: goalText,
          created_at: new Date().toISOString()
        })
        .select();
        
      if (error) throw error;
      
      // Reload goals to get the new goal with its ID
      await loadGoalsData();
    } catch (err: any) {
      console.error('Error adding goal:', err);
      setGoalsError(err.message || 'Failed to add goal');
    }
  };
  
  const updateGoal = async (goalId: string, goalText: string) => {
    try {
      const { error } = await supabase
        .from('goal')
        .update({ description: goalText })
        .eq('id', goalId);
        
      if (error) throw error;
      
      // Update the goal in the state
      setGoals(prev => 
        prev.map(goal => 
          goal.id === goalId ? { ...goal, description: goalText } : goal
        )
      );
    } catch (err: any) {
      console.error('Error updating goal:', err);
      setGoalsError(err.message || 'Failed to update goal');
    }
  };
  
  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goal')
        .delete()
        .eq('id', goalId);
        
      if (error) throw error;
      
      // Remove the goal from the state
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
    } catch (err: any) {
      console.error('Error deleting goal:', err);
      setGoalsError(err.message || 'Failed to delete goal');
    }
  };
  
  // Key deliverables functions
  const addKeyDeliverable = async (deliverableText: string, isEditable: boolean = true) => {
    try {
      const { data, error } = await supabase
        .from('key_deliverable')
        .insert({
          customer_id: customerId,
          description: deliverableText,
          is_editable: isEditable,
          created_at: new Date().toISOString()
        })
        .select();
        
      if (error) throw error;
      
      // Reload deliverables to get the new deliverable with its ID
      await loadDeliverablesData();
    } catch (err: any) {
      console.error('Error adding key deliverable:', err);
      setDeliverablesError(err.message || 'Failed to add key deliverable');
    }
  };
  
  const updateKeyDeliverable = async (deliverableId: string, deliverableText: string) => {
    try {
      const { error } = await supabase
        .from('key_deliverable')
        .update({ description: deliverableText })
        .eq('id', deliverableId);
        
      if (error) throw error;
      
      // Update the deliverable in the state
      setDeliverables(prev => 
        prev.map(deliverable => 
          deliverable.id === deliverableId ? { ...deliverable, description: deliverableText } : deliverable
        )
      );
    } catch (err: any) {
      console.error('Error updating key deliverable:', err);
      setDeliverablesError(err.message || 'Failed to update key deliverable');
    }
  };
  
  const deleteKeyDeliverable = async (deliverableId: string) => {
    try {
      const { error } = await supabase
        .from('key_deliverable')
        .delete()
        .eq('id', deliverableId);
        
      if (error) throw error;
      
      // Remove the deliverable from the state
      setDeliverables(prev => prev.filter(deliverable => deliverable.id !== deliverableId));
    } catch (err: any) {
      console.error('Error deleting key deliverable:', err);
      setDeliverablesError(err.message || 'Failed to delete key deliverable');
    }
  };
  
  // Organization functions
  const resetOrgForm = () => {
    setOrgFormData({ customer_id: customerId });
    setEditingOrg(null);
    setShowOrgForm(!showOrgForm);
  };
  
  const handleOrgFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOrgFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const saveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgFormData.org_id || !orgFormData.org_name) {
      setOrgsError('Organization ID and Name are required');
      return;
    }
    
    try {
      if (editingOrg) {
        // Update existing org
        const { error } = await supabase
          .from('org')
          .update({
            org_name: orgFormData.org_name,
            updated_at: new Date().toISOString()
          })
          .eq('org_id', editingOrg.org_id);
          
        if (error) throw error;
      } else {
        // Create new org
        const { error } = await supabase
          .from('org')
          .insert({
            org_id: orgFormData.org_id,
            org_name: orgFormData.org_name,
            customer_id: customerId,
            created_at: new Date().toISOString()
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
  
  const handleEditOrg = (org: OrgDetails) => {
    setEditingOrg(org);
    setOrgFormData({
      org_id: org.org_id,
      org_name: org.org_name,
      customer_id: org.customer_id
    });
    setShowOrgForm(true);
  };
  
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
  
  // Contact functions
  const resetContactForm = () => {
    setContactFormData({ customer_id: customerId });
    setEditingContact(null);
    setShowContactForm(!showContactForm);
  };
  
  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContactFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactFormData.name || !contactFormData.email) {
      setContactsError('Contact Name and Email are required');
      return;
    }
    
    try {
      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('contact')
          .update({
            name: contactFormData.name,
            email: contactFormData.email,
            phone: contactFormData.phone || null,
            title: contactFormData.title || null,
            company_id: contactFormData.company_id || customerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingContact.id);
          
        if (error) throw error;
      } else {
        // Create new contact
        const { error } = await supabase
          .from('contact')
          .insert({
            name: contactFormData.name,
            email: contactFormData.email,
            phone: contactFormData.phone || null,
            title: contactFormData.title || null,
            customer_id: customerId,
            company_id: contactFormData.company_id || customerId,
            created_at: new Date().toISOString()
          });
          
        if (error) throw error;
      }
      
      // Reload contacts list
      await loadContactsData();
      resetContactForm();
      setContactsError(null); // Clear any previous errors on success
    } catch (err: any) {
      console.error('Error saving contact:', err);
      setContactsError(err.message || 'Failed to save contact');
    }
  };
  
  const handleEditContact = (contact: CustomerContact) => {
    setEditingContact(contact);
    setContactFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      title: contact.title || '',
      customer_id: contact.customer_id,
      company_id: contact.company_id || contact.customer_id
    });
    setShowContactForm(true);
  };
  
  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('contact')
        .delete()
        .eq('id', contactId);
        
      if (error) throw error;
      
      // Reload contacts
      await loadContactsData();
    } catch (err: any) {
      console.error('Error deleting contact:', err);
      setContactsError(err.message || 'Failed to delete contact');
    }
  };
  
  // Customer edit form functions
  const resetCompanyForm = (customer: CustomerDetails) => {
    setFormData({
      name: customer.name,
      contact_email: customer.contact_email,
      contact_phone: customer.contact_phone,
      industry: customer.industry,
      size: customer.size,
      address: customer.address,
      status: customer.status,
      profile: customer.profile
    });
  };
  
  const handleCompanyFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const saveCompanyChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert('Company name is required');
      return;
    }
    
    setSaveLoading(true);
    
    try {
      const { error } = await supabase
        .from('customer')
        .update({
          name: formData.name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          industry: formData.industry,
          size: formData.size,
          address: formData.address,
          status: formData.status,
          profile: formData.profile,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);
        
      if (error) throw error;
      
      // Update customer state
      if (customer) {
        setCustomer({
          ...customer,
          name: formData.name!,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          industry: formData.industry,
          size: formData.size,
          address: formData.address,
          status: formData.status,
          profile: formData.profile,
          updated_at: new Date().toISOString()
        });
      }
      
      setShowEditModal(false);
    } catch (err: any) {
      console.error('Error updating company:', err);
      alert('Failed to update company: ' + err.message);
    } finally {
      setSaveLoading(false);
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
        <CustomerLayout
          customer={customer}
          goals={goals}
          goalsLoading={goalsLoading}
          goalsError={goalsError}
          deliverables={deliverables}
          deliverablesLoading={deliverablesLoading}
          deliverablesError={deliverablesError}
          orgs={orgs}
          orgsLoading={orgsLoading}
          orgsError={orgsError}
          contacts={contacts}
          contactsLoading={false}
          contactsError={contactsError}
          conversations={conversations}
          calls={calls}
          participants={participants}
          showEditModal={showEditModal}
          showOrgForm={showOrgForm}
          formData={formData}
          orgFormData={orgFormData}
          editingOrg={editingOrg}
          contactFormData={contactFormData}
          editingContact={editingContact}
          showContactForm={showContactForm}
          saveLoading={saveLoading}
          availableCompanies={availableCompanies}
          
          // Functions
          resetCompanyForm={resetCompanyForm}
          formatDate={formatDate}
          formatDuration={formatDuration}
          updateCustomerProfile={updateCustomerProfile}
          addGoal={addGoal}
          updateGoal={updateGoal}
          deleteGoal={deleteGoal}
          addKeyDeliverable={addKeyDeliverable}
          updateKeyDeliverable={updateKeyDeliverable}
          deleteKeyDeliverable={deleteKeyDeliverable}
          resetOrgForm={resetOrgForm}
          handleOrgFormChange={handleOrgFormChange}
          saveOrg={saveOrg}
          handleEditOrg={handleEditOrg}
          handleDeleteOrg={handleDeleteOrg}
          resetContactForm={resetContactForm}
          handleContactFormChange={handleContactFormChange}
          saveContact={saveContact}
          handleEditContact={handleEditContact}
          handleDeleteContact={handleDeleteContact}
          handleCompanyFormChange={handleCompanyFormChange}
          saveCompanyChanges={saveCompanyChanges}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500">Customer not found</p>
        </div>
      )}
    </div>
  );
}
