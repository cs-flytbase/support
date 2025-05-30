"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// Define types for our contact data
type Contact = {
  id: string;
  customer_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  is_primary: boolean | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  call_count?: number;
};

type Customer = {
  id: string;
  name: string;
};

// Main Contacts Page Component
export default function ContactsPage() {
  // Client-side state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  
  const router = useRouter();
  const supabase = createClient();
  
  // Load contacts with call counts
  const loadContacts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get all contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('customer_contacts')
        .select(`
          *,
          customers!customer_contacts_customer_id_fkey(name)
        `);
      
      if (contactsError) throw contactsError;
      
      // Get call counts for each contact
      const { data: callCountData, error: callCountError } = await supabase
        .rpc('get_contact_call_counts');
        
      // If the RPC function doesn't exist, we'll handle it gracefully
      if (callCountError) {
        console.error('Error fetching call counts:', callCountError);
        // Continue with empty call counts rather than failing completely
      }
      
      // Map call counts to contacts
      const contactsWithCallCounts = contactsData.map((contact: any) => {
        const callCount = callCountData.find((c: any) => c.contact_id === contact.id);
        return {
          ...contact,
          customer_name: contact.customers?.name || 'N/A',
          call_count: callCount ? parseInt(callCount.count) : 0
        };
      });
      
      setContacts(contactsWithCallCounts || []);
    } catch (err: any) {
      console.error('Error loading contacts:', err);
      setError(err.message || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  // Load customers for filter
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
      // Don't set error state here as it's not critical
    }
  };
  
  // Load data on initial render
  useEffect(() => {
    loadContacts();
    loadCustomers();
  }, []);
  
  // Filter contacts based on search term and customer filter
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Apply customer filter
      const customerMatch = customerFilter === 'all' || contact.customer_id === customerFilter;
      
      // Apply search term filter (case insensitive)
      const searchMatch = !searchTerm || 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.phone && contact.phone.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return customerMatch && searchMatch;
    });
  }, [contacts, searchTerm, customerFilter]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Contacts</h1>
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
      {!isLoading && contacts.length > 0 && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-grow">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, email or phone..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-full md:w-64">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
              >
                <option value="all">All Customers</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Show filter result count */}
            <div className="text-sm text-gray-500 whitespace-nowrap">
              Showing {filteredContacts.length} of {contacts.length} contacts
            </div>
          </div>
        </div>
      )}
      
      {/* Contacts Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          {contacts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No contacts found.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calls
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <tr 
                    key={contact.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/customers/${contact.customer_id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                      {contact.title && (
                        <div className="text-sm text-gray-500">
                          {contact.title}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contact.customer_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      {contact.email && (
                        <div className="text-sm text-gray-900">
                          <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="text-sm text-gray-500">
                          <a href={`tel:${contact.phone}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                            {contact.phone}
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contact.call_count || 0}</div>
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
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent navigation to customer page
                          setEditingContact(contact);
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Change Customer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Edit Modal for Changing Customer */}
      {showEditModal && editingContact && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Change Customer for {editingContact.name}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Customer
              </label>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                {editingContact.customer_name || 'Not assigned'}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Customer
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingContact.customer_id || ''}
                onChange={(e) => {
                  setEditingContact({
                    ...editingContact,
                    customer_id: e.target.value
                  });
                }}
              >
                <option value="">-- Select a Customer --</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const supabase = createClient();
                    
                    // Update the contact's customer_id in the database
                    const { error } = await supabase
                      .from('customer_contacts')
                      .update({ 
                        customer_id: editingContact.customer_id,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', editingContact.id);
                      
                    if (error) throw error;
                    
                    // Update the contact in the local state
                    setContacts(contacts.map(c => 
                      c.id === editingContact.id 
                        ? {
                            ...c, 
                            customer_id: editingContact.customer_id,
                            customer_name: customers.find(cust => cust.id === editingContact.customer_id)?.name || c.customer_name
                          }
                        : c
                    ));
                    
                    // Close the modal and show success message
                    setShowEditModal(false);
                    setError(null);
                    alert(`Contact ${editingContact.name} has been moved to ${customers.find(c => c.id === editingContact.customer_id)?.name}`);
                  } catch (err: any) {
                    console.error('Error updating contact customer:', err);
                    setError(err.message || 'Failed to update contact customer');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={!editingContact.customer_id}
              >
                Update Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
