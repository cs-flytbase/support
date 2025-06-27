# Customer Detail Page Analysis & Migration Plan

## Overview
This document analyzes the two customer detail pages and provides a migration plan to merge functionality from `page-test.tsx` into the main `page.tsx` file.

## Current State Analysis

### Main Page (`page.tsx`)
**Structure:**
- Simple layout with CustomerDashboardCard as the main component
- No tabbed interface - just displays dashboard information
- Missing contact management, organization management, and detailed views

**Components Used:**
- CustomerDashboardCard (main component)
- EditCustomerModal
- FC Summary integration via useFCSummary hook

**Data Sources:**
- **Supabase:** Customer details, contacts, calls, conversations
- **MongoDB:** Goals, deliverables, deals (via separate hooks)
- **FC Summary:** Flight Centre partnership data

**State Management:**
- Basic customer, contacts, calls, conversations state
- Goals and deliverables with loading states
- Deals management with error handling
- FC Summary integration

**Missing Functionality:**
- Tabbed interface
- Contact management (add/edit/delete)
- Organization management 
- Goals and deliverables CRUD operations
- Detailed customer profile editing

### Test Page (`page-test.tsx`)
**Structure:**
- Comprehensive tabbed interface with 4 tabs:
  1. **Dashboard:** CustomerDashboard component with engagement metrics
  2. **Details:** Customer profile + Organizations + Goals + Key deliverables
  3. **Contacts:** Full contact management
  4. **Activities:** Communication history (calls, conversations)

**Components Used:**
- CustomerDashboard (enhanced version with metrics)
- CustomerProfileSection
- OrganizationSection  
- ContactsSection
- CommunicationTabs
- GoalsSection
- KeyDeliverablesSection
- EditCustomerModal

**Data Sources:**
- **Supabase:** Same as main page plus organization data
- **MongoDB:** Same as main page
- **Generated Data:** Engagement metrics, sentiment scores

**State Management:**
- All state from main page PLUS:
- Organization management (orgs, orgsLoading, orgsError, showOrgForm, editingOrg, orgFormData)
- Profile editing (profileSaving)
- Contact management (contactsLoading, showContactForm, editingContact, contactFormData, availableCompanies)
- Customer editing (showCustomerEditModal, customerEditData, customerEditLoading, selectedContactForEdit, selectedPrimaryContactId)

**Key Functions:**
- `loadOrganizations()` - Fetch org data from Supabase
- `saveOrg()` - Add/update organization
- `handleDeleteOrg()` - Delete organization
- `loadAvailableCompanies()` - Load customer options for contacts
- `saveContact()` - Add/update contacts
- `handleDeleteContact()` - Delete contacts
- `setPrimaryContact()` - Set primary contact
- `updateCustomerProfile()` - Update customer profile
- `saveCompanyChanges()` - Save company info changes

## Data Flow Analysis

### Supabase Tables Used:
1. **customers** - Main customer information
2. **customer_contacts** - Contact information 
3. **customer_organizations** - Organization relationships
4. **conversations** - Chat/message history
5. **calls** - Call records with participants

### MongoDB Collections:
1. **goals** - Customer goals tracking
2. **key_deliverables** - Key deliverable items
3. **deals** - Deal/opportunity tracking

### External APIs:
- FC Summary API for Flight Centre partnership data

## Migration Plan

### Phase 1: Prepare Main Page
1. Add missing imports and components
2. Add missing state variables for:
   - Organization management
   - Contact management  
   - Profile editing
   - Modal states

### Phase 2: Add Missing Functions
1. Copy all data loading functions from test page:
   - `loadOrganizations()`
   - `loadAvailableCompanies()`
   - Organization CRUD operations
   - Contact CRUD operations
   - Profile update functions

### Phase 3: Replace Dashboard Section
1. Replace the single CustomerDashboardCard with tabbed interface
2. Preserve existing CustomerDashboardCard in Dashboard tab
3. Add Details, Contacts, and Activities tabs

### Phase 4: Integration & Testing
1. Ensure all imports are correct
2. Test data loading and CRUD operations
3. Verify tab navigation works
4. Check error handling

## Key Differences to Address

### Missing Components in Main Page:
- CustomerDashboard (enhanced version)
- CustomerProfileSection
- OrganizationSection
- ContactsSection  
- CommunicationTabs
- GoalsSection
- KeyDeliverablesSection

### Missing State Variables:
```typescript
// Organization management
const [orgs, setOrgs] = useState<OrgDetails[]>([]);
const [orgsLoading, setOrgsLoading] = useState(true);
const [orgsError, setOrgsError] = useState<string | null>(null);
const [showOrgForm, setShowOrgForm] = useState(false);
const [editingOrg, setEditingOrg] = useState<OrgDetails | null>(null);
const [orgFormData, setOrgFormData] = useState<Partial<OrgDetails>>({...});

// Contact management
const [contactsLoading, setContactsLoading] = useState(true);
const [showContactForm, setShowContactForm] = useState(false);
const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
const [contactFormData, setContactFormData] = useState<Partial<CustomerContact>>({...});
const [availableCompanies, setAvailableCompanies] = useState<CustomerDetails[]>([]);

// Customer editing
const [showCustomerEditModal, setShowCustomerEditModal] = useState(false);
const [customerEditData, setCustomerEditData] = useState<Partial<CustomerDetails>>({...});
const [customerEditLoading, setCustomerEditLoading] = useState(false);
const [selectedContactForEdit, setSelectedContactForEdit] = useState<CustomerContact | null>(null);
const [selectedPrimaryContactId, setSelectedPrimaryContactId] = useState<string | null>(null);

// Profile saving
const [profileSaving, setProfileSaving] = useState(false);
```

### Missing Functions:
- All organization CRUD operations
- Contact management functions
- Profile update functions
- Form handlers for various entities

## Implementation Strategy

1. **Preserve existing functionality** - Don't break current CustomerDashboardCard integration
2. **Add tabbed interface** - Wrap existing content in Dashboard tab
3. **Progressive enhancement** - Add other tabs with their functionality
4. **Maintain data consistency** - Ensure all data loading works across tabs
5. **Error handling** - Preserve existing error states and add new ones
