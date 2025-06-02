"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { format } from 'date-fns';

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Mail, CalendarClock, ArrowUpDown } from 'lucide-react';

// Define types for our email data
type Email = {
  id: number;
  created_at: string;
  sender_email: string;
  company_id: string | null;
  company_name: string | null;
  contact_name: string | null;
  contact_id: string | null;
  email_body: string | null;
  sentiment: number | null;
  sentement_reason: string | null;
  key_points: any[] | null;
};

export default function EmailsLayout({ children }: { children: React.ReactNode }) {
  // Client-side state
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Email, direction: 'asc' | 'desc' }>({ 
    key: 'created_at', 
    direction: 'desc' 
  });
  
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };
  
  // Load emails with customer and contact information
  const loadEmails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First get emails with basic information
      const { data: emailsData, error: emailsError } = await supabase
        .from('email')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (emailsError) throw emailsError;
      
      if (!emailsData || emailsData.length === 0) {
        setEmails([]);
        return;
      }
      
      // Get all unique customer IDs from the emails
      const customerIds = Array.from(new Set(
        emailsData
          .filter(email => email.company_id)
          .map(email => email.company_id)
      ));
      
      // Get all unique contact IDs from the emails
      const contactIds = Array.from(new Set(
        emailsData
          .filter(email => email.contact_id)
          .map(email => email.contact_id)
      ));
      
      // Fetch customer names for all customer IDs in a batch
      let customerNames: Record<string, string> = {};
      if (customerIds.length > 0) {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, name')
          .in('id', customerIds as string[]);
        
        if (!customersError && customersData) {
          customersData.forEach(customer => {
            customerNames[customer.id] = customer.name;
          });
        }
      }
      
      // Fetch contact names for all contact IDs in a batch
      let contactNames: Record<string, string> = {};
      if (contactIds.length > 0) {
        const { data: contactsData, error: contactsError } = await supabase
          .from('customer_contacts')
          .select('id, name')
          .in('id', contactIds as string[]);
        
        if (!contactsError && contactsData) {
          contactsData.forEach(contact => {
            contactNames[contact.id] = contact.name;
          });
        }
      }
      
      // Now augment the email data with customer and contact names
      const augmentedEmails = emailsData.map(email => ({
        ...email,
        company_name: email.company_id ? customerNames[email.company_id] || email.company_name : email.company_name,
        contact_name: email.contact_id ? contactNames[email.contact_id] || email.contact_name : email.contact_name
      }));
      
      setEmails(augmentedEmails);
    } catch (err: any) {
      console.error('Error loading emails:', err);
      setError(err.message || 'Failed to load emails');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load emails on component mount
  useEffect(() => {
    loadEmails();
  }, []);
  
  // Handle sorting
  const handleSort = (key: keyof Email) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        return {
          ...prevConfig,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'desc' };
    });
  };
  
  // Get sentiment badge
  const getSentimentBadge = (sentiment: number | null) => {
    if (sentiment === null) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
    
    if (sentiment >= 70) {
      return <Badge variant="outline" className="bg-green-100 text-green-800">Positive</Badge>;
    }
    
    if (sentiment >= 40) {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Neutral</Badge>;
    }
    
    return <Badge variant="outline" className="bg-red-100 text-red-800">Negative</Badge>;
  };
  
  // Filter and sort emails
  const filteredAndSortedEmails = useMemo(() => {
    return [...emails]
      .filter(email => {
        // Apply sentiment filter
        if (sentimentFilter !== 'all') {
          const sentimentValue = email.sentiment || 0;
          
          if (sentimentFilter === 'positive' && sentimentValue < 70) return false;
          if (sentimentFilter === 'neutral' && (sentimentValue < 40 || sentimentValue >= 70)) return false;
          if (sentimentFilter === 'negative' && sentimentValue >= 40) return false;
        }
        
        // Apply search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          return (
            (email.sender_email && email.sender_email.toLowerCase().includes(searchLower)) ||
            (email.email_body && email.email_body.toLowerCase().includes(searchLower)) ||
            (email.company_name && email.company_name.toLowerCase().includes(searchLower)) ||
            (email.contact_name && email.contact_name.toLowerCase().includes(searchLower))
          );
        }
        
        return true;
      })
      .sort((a, b) => {
        const key = sortConfig.key;
        
        if (key === 'created_at') {
          const dateA = new Date(a[key] || '').getTime();
          const dateB = new Date(b[key] || '').getTime();
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        
        const valueA = a[key] || '';
        const valueB = b[key] || '';
        
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return sortConfig.direction === 'asc' 
            ? valueA.localeCompare(valueB) 
            : valueB.localeCompare(valueA);
        }
        
        return 0;
      });
  }, [emails, searchTerm, sentimentFilter, sortConfig]);
  
  // Helper function to truncate text
  const truncateText = (text: string | null, maxLength = 60) => {
    if (!text) return 'N/A';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Emails</h1>
      </div>
      
      <Card>
        <CardHeader className="pb-0">
          <CardTitle>Email List</CardTitle>
          <CardDescription>View and manage customer email communications</CardDescription>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search emails..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select 
              value={sentimentFilter} 
              onValueChange={setSentimentFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-2">{error}</p>
              <Button onClick={loadEmails}>Try Again</Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Date
                        {sortConfig.key === 'created_at' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('sender_email')}
                    >
                      <div className="flex items-center">
                        From
                        {sortConfig.key === 'sender_email' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('company_name')}
                    >
                      <div className="flex items-center">
                        Company
                        {sortConfig.key === 'company_name' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Sentiment</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {filteredAndSortedEmails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                        No emails found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedEmails.map((email) => (
                      <TableRow 
                        key={email.id} 
                        className={`cursor-pointer hover:bg-gray-50 ${pathname === `/emails/${email.id}` ? 'bg-blue-50' : ''}`}
                        onClick={() => router.push(`/emails/${email.id}`)}
                      >
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center">
                            <CalendarClock className="mr-2 h-4 w-4 text-gray-400" />
                            {formatDate(email.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Mail className="mr-2 h-4 w-4 text-gray-400" />
                            {email.sender_email}
                          </div>
                        </TableCell>
                        <TableCell>{email.company_name || 'N/A'}</TableCell>
                        <TableCell>{truncateText(email.email_body)}</TableCell>
                        <TableCell>{getSentimentBadge(email.sentiment)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Child routes will be rendered here */}
      {children}
    </div>
  );
}
