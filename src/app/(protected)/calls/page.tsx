"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface Call {
  id: string;
  name: string;
  customer_id: string;
  duration: number;
  status: string;
  scheduled_start_time: string | null;
  actual_start_time: string | null;
  end_time: string | null;
  created_at: string;
  recording_url: string | null;
  customer_name?: string; // From customer join
}

interface Customer {
  id: string;
  name: string;
  customer_type: string;
}

type TimeFilter = 'all' | 'today' | 'week' | 'month';

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const router = useRouter();
  const supabase = createClient();

  // Load customers for filter
  useEffect(() => {
    async function loadCustomers() {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, customer_type')
          .order('name');
          
        if (error) throw error;
        setCustomers(data || []);
      } catch (err: any) {
        console.error('Error loading customers:', err);
      }
    }
    
    loadCustomers();
  }, [supabase]);

  // Load calls with filters
  useEffect(() => {
    async function loadCalls() {
      setLoading(true);
      setError(null);
      
      try {
        // Start building query to get calls
        let query = supabase
          .from('calls')
          .select(`
            id,
            name,
            customer_id,
            duration,
            status,
            scheduled_start_time,
            actual_start_time,
            end_time,
            created_at,
            recording_url
          `);
        
        // Apply time filter
        if (timeFilter !== 'all') {
          const now = new Date();
          let startDate: Date;
          
          if (timeFilter === 'today') {
            startDate = new Date(now.setHours(0, 0, 0, 0));
          } else if (timeFilter === 'week') {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
          } else if (timeFilter === 'month') {
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 1);
          } else {
            startDate = new Date(0); // fallback
          }
          
          query = query.gte('created_at', startDate.toISOString());
        }
        
        // Apply customer filter
        if (customerFilter !== 'all') {
          query = query.eq('customer_id', customerFilter);
        }
        
        // Apply search filter if provided
        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }
        
        // Finalize query
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Get all unique customer IDs
        const customerIds = Array.from(new Set(
          data
            .map(call => call.customer_id)
            .filter(id => id) // Filter out null/undefined IDs
        ));
        
        // Create a map to store customer names
        const customerMap: Record<string, string> = {};
        
        // If we have customer IDs, fetch their details
        if (customerIds.length > 0) {
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('id, name')
            .in('id', customerIds);
          
          if (customerError) throw customerError;
          
          // Populate the customer map
          (customerData || []).forEach(customer => {
            customerMap[customer.id] = customer.name;
          });
        }
        
        // Format the data to include customer name
        const formattedCalls = data.map(call => ({
          ...call,
          customer_name: call.customer_id && customerMap[call.customer_id] 
            ? customerMap[call.customer_id] 
            : 'Unknown Customer'
        }));
        
        setCalls(formattedCalls);
      } catch (err: any) {
        console.error('Error loading calls:', err);
        setError(err.message || 'Failed to load calls');
      } finally {
        setLoading(false);
      }
    }
    
    loadCalls();
  }, [supabase, timeFilter, customerFilter, searchTerm]);

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Calls</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Search and Filter Bar */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search input */}
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search calls..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Time filter */}
          <div className="w-full md:w-1/4">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>
          
          {/* Customer filter */}
          <div className="w-full md:w-1/3">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            >
              <option value="all">All Customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Result count */}
          <div className="text-sm text-gray-500 whitespace-nowrap">
            {loading ? 'Loading...' : `${calls.length} calls found`}
          </div>
        </div>
      </div>
      
      {/* Calls Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          {calls.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No calls found. Try adjusting your filters.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recording
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calls.map((call) => (
                  <tr 
                    key={call.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/calls/${call.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{call.name || 'Untitled Call'}</div>
                      <div className="text-xs text-gray-500">{formatDate(call.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{call.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.duration ? formatDuration(call.duration) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${call.status === 'completed' ? 'bg-green-100 text-green-800' : call.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {call.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(call.actual_start_time || call.scheduled_start_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {call.recording_url ? (
                        <a 
                          href={call.recording_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">No recording</span>
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
