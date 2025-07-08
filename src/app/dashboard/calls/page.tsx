"use client";

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/utils/supabase/client';
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
  customer_name: string;
  customers?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Customer {
  id: string;
  name: string;
  customer_type: string;
}

type TimeFilter = 'all' | 'today' | 'week' | 'month';

export default function DashboardCallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  
  const router = useRouter();
  const supabase = supabaseClient;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load calls with filters
  useEffect(() => {
    let isMounted = true;

    async function loadCalls() {
      if (!isMounted) return;
      
      setLoading(true);
      setError(null);
      
      try {
        let query = supabase
          .from('calls')
          .select(`
            *,
            customers (
              id,
              name,
              email
            )
          `);
        
        // Apply time filter
        const now = new Date();
        let startDate: Date | null = null;
        
        switch (timeFilter) {
          case 'today':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'all':
            // Don't set a start date for 'all'
            break;
        }
        
        // Only apply date filter if startDate is set
        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }

        // Apply search filter if provided
        if (debouncedSearchTerm) {
          query = query.or(`name.ilike.%${debouncedSearchTerm}%,customers.name.ilike.%${debouncedSearchTerm}%`);
        }

        // Execute query
        const { data, error: fetchError } = await query
          .order('created_at', { ascending: false })
          .limit(50);

        if (!isMounted) return;

        if (fetchError) {
          console.error('Fetch error:', fetchError);
          throw fetchError;
        }

        if (!data) {
          setCalls([]);
          return;
        }

        // Transform the data
        const formattedCalls = data.map(call => ({
          ...call,
          name: call.name || 'Untitled Call',
          customer_name: call.customers?.name || 'Unknown Customer',
        }));

        setCalls(formattedCalls);
      } catch (err: any) {
        console.error('Error loading calls:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load calls');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCalls();

    return () => {
      isMounted = false;
    };
  }, [supabase, timeFilter, debouncedSearchTerm]); // Use debouncedSearchTerm instead of searchTerm

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Recent Calls</h1>
          
          <div className="flex items-center gap-4">
            {/* Search input */}
            <div className="relative">
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
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        {/* Calls Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calls.length === 0 ? (
              <div className="col-span-full p-6 text-center text-gray-500 bg-white rounded-lg shadow">
                No calls found. Try adjusting your filters.
              </div>
            ) : (
              calls.map((call) => (
                <div
                  key={call.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden"
                  onClick={() => router.push(`/calls/${call.id}`)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {call.name || 'Untitled Call'}
                        </h3>
                        <p className="text-sm text-gray-600">{call.customer_name}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        call.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        call.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status || 'unknown'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Duration</p>
                        <p className="font-medium">
                          {call.duration ? formatDuration(call.duration) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Call Time</p>
                        <p className="font-medium">
                          {formatDate(call.actual_start_time || call.scheduled_start_time)}
                        </p>
                      </div>
                    </div>
                    
                    {call.recording_url && (
                      <div className="mt-4 pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={call.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          View Recording
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
