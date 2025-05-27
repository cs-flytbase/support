import React from 'react';
import { CustomerDetails, OrgDetails, CustomerContact, CustomerGoal, KeyDeliverable, Conversation, Call, Participant, Agent } from './types';
import { CustomerInfoCard } from './components/CustomerInfoCard';
import { CustomerProfileSection } from './components/CustomerProfileSection';
import { GoalsSection } from './components/GoalsSection';
import { KeyDeliverablesSection } from './components/KeyDeliverablesSection';
import { OrganizationSection } from './components/OrganizationSection';
import { ContactsSection } from './components/ContactsSection';
import { CommunicationTabs } from './components/CommunicationTabs';
import { EditCustomerModal } from './components/EditCustomerModal';

interface CustomerLayoutProps {
  customer: CustomerDetails;
  goals: CustomerGoal[];
  goalsLoading: boolean;
  goalsError: string | null;
  deliverables: KeyDeliverable[];
  deliverablesLoading: boolean;
  deliverablesError: string | null;
  orgs: OrgDetails[];
  orgsLoading: boolean;
  orgsError: string | null;
  contacts: CustomerContact[];
  contactsLoading: boolean;
  contactsError: string | null;
  conversations: Conversation[];
  calls: Call[];
  participants: Record<string, Participant[]>;
  showEditModal: boolean;
  showOrgForm: boolean;
  formData: Partial<CustomerDetails>;
  orgFormData: Partial<OrgDetails>;
  editingOrg: OrgDetails | null;
  contactFormData: Partial<CustomerContact>;
  editingContact: CustomerContact | null;
  showContactForm: boolean;
  saveLoading: boolean;
  availableCompanies: CustomerDetails[];
  primaryContactId: string | null;
  agents: Agent[];
  
  // Functions
  resetCompanyForm: (customer: CustomerDetails) => void;
  formatDate: (date: string | null) => string;
  formatDuration: (seconds: number | null) => string;
  updateCustomerProfile: (profileText: string) => Promise<void>;
  addGoal: (goalText: string) => Promise<void>;
  updateGoal: (goalId: string, goalText: string) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  addKeyDeliverable: (deliverableText: string, isEditable: boolean) => Promise<void>;
  updateKeyDeliverable: (deliverableId: string, deliverableText: string) => Promise<void>;
  deleteKeyDeliverable: (deliverableId: string) => Promise<void>;
  resetOrgForm: () => void;
  handleOrgFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saveOrg: (e: React.FormEvent) => Promise<void>;
  handleEditOrg: (org: OrgDetails) => void;
  handleDeleteOrg: (orgId: string) => Promise<void>;
  resetContactForm: () => void;
  handleContactFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  saveContact: (e: React.FormEvent) => Promise<void>;
  handleEditContact: (contact: CustomerContact) => void;
  handleDeleteContact: (contactId: string) => Promise<void>;
  handleCompanyFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  saveCompanyChanges: (e: React.FormEvent) => Promise<void>;
  onPrimaryContactChange: (contactId: string) => Promise<void>;
}

const CustomerLayout: React.FC<CustomerLayoutProps> = ({
  customer,
  goals,
  goalsLoading,
  goalsError,
  deliverables,
  deliverablesLoading,
  deliverablesError,
  orgs,
  orgsLoading,
  orgsError,
  contacts,
  contactsLoading,
  contactsError,
  conversations,
  calls,
  participants,
  showEditModal,
  showOrgForm,
  formData,
  orgFormData,
  editingOrg,
  contactFormData,
  editingContact,
  showContactForm,
  saveLoading,
  availableCompanies,
  primaryContactId,
  agents,
  
  // Functions
  resetCompanyForm,
  formatDate,
  formatDuration,
  updateCustomerProfile,
  addGoal,
  updateGoal,
  deleteGoal,
  addKeyDeliverable,
  updateKeyDeliverable,
  deleteKeyDeliverable,
  resetOrgForm,
  handleOrgFormChange,
  saveOrg,
  handleEditOrg,
  handleDeleteOrg,
  resetContactForm,
  handleContactFormChange,
  saveContact,
  handleEditContact,
  handleDeleteContact,
  handleCompanyFormChange,
  saveCompanyChanges,
  onPrimaryContactChange,
}) => {
  return (
    <div className="grid grid-cols-1 gap-8">
      {/* Main Section - Customer Info */}
      <div>
        <CustomerInfoCard 
          customer={customer}
          contacts={contacts}
          onEdit={() => {
            if (customer) resetCompanyForm(customer);
          }}
          onSetPrimaryContact={async (contactId) => {
            // This is just a placeholder implementation
            // The actual functionality is in the page.tsx file
            console.log('Set primary contact requested:', contactId);
            return Promise.resolve();
          }}
          formatDate={formatDate}
        />
      </div>
      
      {/* Customer Details Section - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Customer Profile Section */}
          <CustomerProfileSection
            customer={customer}
            onSave={updateCustomerProfile}
            formatDate={formatDate}
          />
          
          {/* Goals Section */}
          <GoalsSection
            goals={goals}
            agents={agents}
            isLoading={goalsLoading}
            error={goalsError}
            onAddGoal={addGoal}
            onUpdateGoal={updateGoal}
            onDeleteGoal={deleteGoal}
            formatDate={formatDate}
            formatDuration={formatDuration}
          />
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          {/* Key Deliverables Section */}
          <KeyDeliverablesSection
            deliverables={deliverables}
            agents={agents}
            isLoading={deliverablesLoading}
            error={deliverablesError}
            onAddDeliverable={addKeyDeliverable}
            onUpdateDeliverable={updateKeyDeliverable}
            onDeleteDeliverable={deleteKeyDeliverable}
            formatDate={formatDate}
            formatDuration={formatDuration}
          />
          
          {/* Organization Section Component */}
          <OrganizationSection 
            orgs={orgs}
            isLoading={orgsLoading}
            error={orgsError}
            showForm={showOrgForm}
            formData={orgFormData}
            editingOrg={editingOrg}
            onShowForm={() => {
              resetOrgForm();
            }}
            onCancel={resetOrgForm}
            onFormChange={handleOrgFormChange}
            onSave={saveOrg}
            onEdit={handleEditOrg}
            onDelete={handleDeleteOrg}
            formatDate={formatDate}
          />
          
          {/* Contacts Component */}
          <ContactsSection
            contacts={contacts}
            isLoading={contactsLoading}
            error={contactsError}
            showForm={showContactForm}
            formData={contactFormData}
            editingContact={editingContact}
            availableCompanies={availableCompanies}
            onShowForm={() => {
              resetContactForm();
            }}
            onCancel={resetContactForm}
            onFormChange={handleContactFormChange}
            onSave={saveContact}
            onEdit={handleEditContact}
            onDelete={handleDeleteContact}
            onSetPrimary={onPrimaryContactChange}
            formatDate={formatDate}
          />
        </div>
      </div>
      
      {/* Communication Tabs Component - Separate from the two-column layout */}
      <div>
        <CommunicationTabs
          conversations={conversations}
          calls={calls}
          participants={participants}
          formatDate={formatDate}
          formatDuration={formatDuration}
        />
      </div>
      
      {/* Edit Modal for Company Details */}
      {showEditModal && (
        <EditCustomerModal
          isOpen={showEditModal}
          onClose={() => {}}
          formData={formData}
          contacts={contacts}
          primaryContactId={primaryContactId}
          onPrimaryContactChange={onPrimaryContactChange}
          onChange={handleCompanyFormChange}
          onSubmit={saveCompanyChanges}
          isLoading={saveLoading}
        />
      )}
    </div>
  );
};

export default CustomerLayout;
