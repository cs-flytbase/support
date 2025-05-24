"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { useRouter } from 'next/navigation';

// Define types for our customer data
type Customer = {
  id: string;
  name: string;
  email: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  customer_type: string | null;
  created_at: string;
  updated_at: string;
};

// Component for the customer form (both create and edit)
const CustomerForm = ({ 
  customer, 
  onSubmit, 
  onCancel 
}: { 
  customer?: Customer; 
  onSubmit: (data: Partial<Customer>) => void; 
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState<Partial<Customer>>(
    customer || {
      name: '',
      email: '',
      website: '',
      phone: '',
      address: '',
      customer_type: 'end_customer'
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
      <h2 className="text-2xl font-semibold mb-6">{customer ? 'Edit Customer' : 'Create New Customer'}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4 md:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <textarea
            id="address"
            name="address"
            value={formData.address || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="customer_type" className="block text-sm font-medium text-gray-700 mb-1">
            Customer Type
          </label>
          <select
            id="customer_type"
            name="customer_type"
            value={formData.customer_type || 'end_customer'}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="end_customer">End Customer</option>
            <option value="partner">Partner</option>
            <option value="presales">Presales</option>
          </select>
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
          {customer ? 'Update Customer' : 'Create Customer'}
        </button>
      </div>
    </form>
  );
};

// Main Customer Page Component
export default function CustomerPage() {
  // Client-side state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const router = useRouter();
  const supabase = createClient();
  
  // Load customers
  const loadCustomers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Error loading customers:', err);
      setError(err.message || 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new customer
  const createCustomer = async (customerData: Partial<Customer>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select();
      
      if (error) throw error;
      
      await loadCustomers();
      setShowForm(false);
    } catch (err: any) {
      console.error('Error creating customer:', err);
      setError(err.message || 'Failed to create customer');
    }
  };
  
  // Update an existing customer
  const updateCustomer = async (customerData: Partial<Customer>) => {
    if (!editingCustomer?.id) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', editingCustomer.id);
      
      if (error) throw error;
      
      await loadCustomers();
      setEditingCustomer(null);
    } catch (err: any) {
      console.error('Error updating customer:', err);
      setError(err.message || 'Failed to update customer');
    }
  };
  
  // Delete a customer
  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await loadCustomers();
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      setError(err.message || 'Failed to delete customer');
    }
  };
  
  // Handle form submission
  const handleFormSubmit = (data: Partial<Customer>) => {
    if (editingCustomer) {
      updateCustomer(data);
    } else {
      createCustomer(data);
    }
  };
  
  // Load customers on initial render
  useEffect(() => {
    loadCustomers();
  }, []);
  
  // Server component to fetch initial data
  // Filter customers based on search term and type filter
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Apply type filter
      const typeMatch = typeFilter === 'all' || customer.customer_type === typeFilter;
      
      // Apply search term filter (case insensitive)
      const searchMatch = !searchTerm || 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return typeMatch && searchMatch;
    });
  }, [customers, searchTerm, typeFilter]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Customers</h1>
        
        {!showForm && !editingCustomer && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Customer
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
      {!isLoading && customers.length > 0 && !showForm && !editingCustomer && (
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
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-full md:w-64">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Customer Types</option>
                <option value="end_customer">End Customer</option>
                <option value="partner">Partner</option>
                <option value="presales">Presales</option>
              </select>
            </div>
            
            {/* Show filter result count */}
            <div className="text-sm text-gray-500 whitespace-nowrap">
              Showing {filteredCustomers.length} of {customers.length} customers
            </div>
          </div>
        </div>
      )}
      
      {/* Customer Form */}
      {(showForm || editingCustomer) && (
        <div className="mb-8">
          <CustomerForm 
            customer={editingCustomer || undefined} 
            onSubmit={handleFormSubmit} 
            onCancel={() => {
              setShowForm(false);
              setEditingCustomer(null);
            }} 
          />
        </div>
      )}
      
      {/* Customers Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          {customers.length === 0 ? (
            <div className="text-center py-12">
              {customers.length > 0 ? (
                <p className="text-gray-500 text-lg">
                  No customers match your search criteria. Try adjusting your filters.
                </p>
              ) : (
                <p className="text-gray-500 text-lg">No customers found. Create your first customer to get started.</p>
              )}
            </div>
          ) : (
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
                    Type
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
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      {customer.website && (
                        <div className="text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                          <a href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-blue-600 hover:underline">
                            {customer.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {customer.email && (
                        <div className="text-sm text-gray-900" onClick={(e) => e.stopPropagation()}>
                          <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                            {customer.email}
                          </a>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                          <a href={`tel:${customer.phone}`} className="hover:underline">
                            {customer.phone}
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {customer.customer_type?.replace('_', ' ') || 'Not Specified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {deleteConfirmId === customer.id ? (
                        <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-gray-700">Confirm delete?</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCustomer(customer.id);
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
                              setEditingCustomer(customer);
                              setShowForm(false);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(customer.id);
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
