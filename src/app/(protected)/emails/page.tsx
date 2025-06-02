"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
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

// Email Detail Drawer Component
const EmailDetailDrawer = ({ 
  email, 
  onClose 
}: { 
  email: Email; 
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
      <div className="bg-white w-full max-w-md p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Email Details</h2>
          <Button variant="ghost" onClick={onClose}>&times;</Button>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">From</h3>
            <p className="text-lg">{email.sender_email}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Company</h3>
            <p className="text-lg">{email.company_name || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Contact</h3>
            <p className="text-lg">{email.contact_name || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Date</h3>
            <p className="text-lg">{format(new Date(email.created_at), 'PPP p')}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Sentiment</h3>
            <div className="flex items-center mt-1">
              <Badge 
                className={email.sentiment && email.sentiment >= 0.5 ? 'bg-green-100 text-green-800' : 
                          email.sentiment && email.sentiment <= 0.3 ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}
              >
                {email.sentiment && email.sentiment >= 0.5 ? 'Positive' : 
                 email.sentiment && email.sentiment <= 0.3 ? 'Negative' : 'Neutral'}
              </Badge>
              <span className="ml-2 text-sm text-gray-500">
                {email.sentiment ? Math.round(email.sentiment * 100) + '%' : 'N/A'}
              </span>
            </div>
            {email.sentement_reason && (
              <p className="mt-1 text-sm text-gray-600">{email.sentement_reason}</p>
            )}
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email Content</h3>
            <div className="mt-2 p-4 bg-gray-50 rounded-md">
              <p className="whitespace-pre-wrap">{email.email_body || 'No content available'}</p>
            </div>
          </div>
          
          {email.key_points && email.key_points.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Key Points</h3>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                {email.key_points.map((point, index) => (
                  <li key={index} className="text-sm">
                    {typeof point === 'string' ? point : JSON.stringify(point)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Email Page Component
export default function EmailsPage() {
  // Client-side state
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Email, direction: 'asc' | 'desc' }>({ 
    key: 'created_at', 
    direction: 'desc' 
  });
  
  const router = useRouter();
  const supabase = createClient();
  
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
      const customerIds = Array.from(
        new Set(emailsData.map(email => email.company_id).filter(Boolean))
      );
      
      // Get all unique contact IDs from the emails
      const contactIds = Array.from(
        new Set(emailsData.map(email => email.contact_id).filter(Boolean))
      );
      
      // Fetch customer data
      const { data: customersData, error: customersError } = customerIds.length > 0 ? 
        await supabase
          .from('customers')
          .select('id, name')
          .in('id', customerIds)
        : { data: [], error: null };
      
      if (customersError) throw customersError;
      
      // Create customer lookup map
      const customerMap: Record<string, string> = {};
      customersData?.forEach(customer => {
        customerMap[customer.id] = customer.name;
      });
      
      // Fetch contact data
      const { data: contactsData, error: contactsError } = contactIds.length > 0 ?
        await supabase
          .from('customer_contacts')
          .select('id, name')
          .in('id', contactIds)
        : { data: [], error: null };
      
      if (contactsError) throw contactsError;
      
      // Create contact lookup map
      const contactMap: Record<string, string> = {};
      contactsData?.forEach(contact => {
        contactMap[contact.id] = contact.name;
      });
      
      // Combine all data
      const enrichedEmails = emailsData.map(email => ({
        ...email,
        company_name: email.company_id ? customerMap[email.company_id] || 'Unknown Company' : null,
        contact_name: email.contact_id ? contactMap[email.contact_id] || 'Unknown Contact' : null
      }));
      
      setEmails(enrichedEmails);
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
  
  // Sort emails
  const handleSort = (key: keyof Email) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Filter and sort emails
  const filteredAndSortedEmails = useMemo(() => {
    // First filter by search term
    let result = emails;
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(email => {
        return (
          (email.sender_email && email.sender_email.toLowerCase().includes(lowerSearchTerm)) ||
          (email.company_name && email.company_name.toLowerCase().includes(lowerSearchTerm)) ||
          (email.contact_name && email.contact_name.toLowerCase().includes(lowerSearchTerm)) ||
          (email.email_body && email.email_body.toLowerCase().includes(lowerSearchTerm))
        );
      });
    }
    
    // Then filter by sentiment
    if (sentimentFilter !== 'all') {
      result = result.filter(email => {
        if (!email.sentiment) return false;
        
        switch (sentimentFilter) {
          case 'positive':
            return email.sentiment >= 0.5;
          case 'neutral':
            return email.sentiment > 0.3 && email.sentiment < 0.5;
          case 'negative':
            return email.sentiment <= 0.3;
          default:
            return true;
        }
      });
    }
    
    // Then sort
    return [...result].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      
      return 0;
    });
  }, [emails, searchTerm, sentimentFilter, sortConfig]);
  
  // Generate sentiment badge
  const getSentimentBadge = (sentiment: number | null) => {
    if (sentiment === null) return <Badge variant="outline">Unknown</Badge>;
    
    if (sentiment >= 0.5) {
      return <Badge className="bg-green-100 text-green-800">Positive</Badge>;
    } else if (sentiment <= 0.3) {
      return <Badge className="bg-red-100 text-red-800">Negative</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">Neutral</Badge>;
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Truncate text
  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Emails</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Email Management</CardTitle>
          <CardDescription>View and search emails in your system</CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search emails..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-[180px]">
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
          
          {/* Emails Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <div className="text-red-500 mb-2">{error}</div>
              <Button onClick={loadEmails}>Try Again</Button>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Date
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('sender_email')}
                    >
                      <div className="flex items-center">
                        From
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('company_name')}
                    >
                      <div className="flex items-center">
                        Company
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('sentiment')}
                    >
                      <div className="flex items-center">
                        Sentiment
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
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
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedEmail(email)}
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
      
      {/* Email Detail Drawer */}
      {selectedEmail && (
        <EmailDetailDrawer 
          email={selectedEmail} 
          onClose={() => setSelectedEmail(null)} 
        />
      )}
    </div>
  );
}
