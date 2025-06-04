"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { X, Mail, User, Building, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

// Define the Email type
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

// Use a client component wrapper to handle params
export default function EmailDetailPage() {
  // Get the id from the URL params using useParams hook
  const params = useParams();
  const emailId = params?.id as string;
  
  const [email, setEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };
  
  // Load email data
  const loadEmail = async () => {
    setIsLoading(true);
    setError(null);
    
    if (!emailId) {
      setError('Email ID is missing');
      setIsLoading(false);
      return;
    }
    
    try {
      // Fetch the email by ID
      const { data, error: emailError } = await supabase
        .from('email')
        .select('*')
        .eq('id', emailId)
        .single();
      
      if (emailError) throw emailError;
      
      if (!data) {
        throw new Error('Email not found');
      }
      
      // Enhanced data with proper contact and company information
      let enhancedData = { ...data };
      
      // If we have a contact_id, fetch contact details
      if (data.contact_id) {
        const { data: contactData, error: contactError } = await supabase
          .from('customer_contacts')
          .select('id, name, email, phone')
          .eq('id', data.contact_id)
          .single();
          
        if (!contactError && contactData) {
          enhancedData.contact_name = contactData.name;
          enhancedData.contact_email = contactData.email;
          enhancedData.contact_phone = contactData.phone;
        }
      }
      
      // If we have a company_id, fetch company details
      if (data.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('customers')
          .select('id, name')
          .eq('id', data.company_id)
          .single();
          
        if (!companyError && companyData) {
          enhancedData.company_name = companyData.name;
        }
      }
      
      setEmail(enhancedData);
    } catch (err: any) {
      console.error('Error loading email:', err);
      setError(err.message || 'Failed to load email details');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {    
    loadEmail();
  }, [emailId, supabase]);
  
  // Get sentiment badge
  const getSentimentBadge = (sentiment: number | null) => {
    if (sentiment === null) return 'Unknown';
    
    if (sentiment > 0.60) {
      return <Badge variant="outline" className="bg-green-100 text-green-800">Positive</Badge>;
    } else if (sentiment >= 0.40) {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Neutral</Badge>;
    } else {
      return <Badge variant="outline" className="bg-red-100 text-red-800">Negative</Badge>;
    }
    return 'Negative';
  };
  
  // Get sentiment color class
  const getSentimentColorClass = (sentiment: number | null) => {
    if (sentiment === null) return 'bg-gray-200 text-gray-800';
    
    if (sentiment >= 70) return 'bg-green-100 text-green-800';
    if (sentiment >= 40) return 'bg-blue-100 text-blue-800';
    return 'bg-red-100 text-red-800';
  };
  
  const handleClose = () => {
    router.push('/emails');
  };
  
  // Handler for overlay click to close if clicked outside modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex justify-end"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="bg-white w-full max-w-md h-full shadow-xl flex flex-col"
        onClick={e => e.stopPropagation()} // Prevent overlay click from propagating
      >
        {/* Sticky header */}
        <div className="flex justify-between items-center sticky top-0 z-20 bg-white px-6 py-4 border-b">
          <Button variant="ghost" size="icon" onClick={handleClose} className="-ml-2">
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-semibold">Email Details</h2>
          <div className="w-8"></div> {/* Spacer for alignment */}
        </div>
        {/* Scrollable content below sticky header */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
        
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={handleClose}>Go Back</Button>
          </div>
        ) : email ? (
          <div className="space-y-6">
            {/* Email metadata section */}
            <div className="space-y-4 pb-4 border-b">
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Date & Time</h3>
                  <p className="text-sm">{formatDate(email.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500">From</h3>
                  <p className="text-sm">{email.sender_email}</p>
                </div>
              </div>
              
              {email.company_name && (
                <div className="flex items-start gap-2">
                  <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Company</h3>
                    {email.company_id ? (
                      <Link href={`/customers/${email.company_id}`} className="text-sm text-blue-600 hover:underline">
                        {email.company_name}
                      </Link>
                    ) : (
                      <p className="text-sm">{email.company_name}</p>
                    )}
                  </div>
                </div>
              )}
              
              {email.contact_name && (
                <div className="flex items-start gap-2">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Contact</h3>
                    {email.contact_id ? (
                      <Link href={`/contacts/${email.contact_id}`} className="text-sm text-blue-600 hover:underline">
                        {email.contact_name}
                      </Link>
                    ) : (
                      <p className="text-sm">{email.contact_name}</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-500">Sentiment:</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium `}>
                  {getSentimentBadge(email.sentiment)}
                </span>
              </div>
            </div>
            
            {/* Email body section */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Email Content</h3>
              <div className="bg-gray-50 p-3 rounded-md text-sm whitespace-pre-wrap">
                {email.email_body || 'No content available'}
              </div>
            </div>
            
            {/* Key points section */}
            {email.key_points && email.key_points.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Key Points</h3>
                <ul className="bg-gray-50 p-3 rounded-md list-disc list-inside space-y-1">
                  {email.key_points.map((point, index) => (
                    <li key={index} className="text-sm">
                      {typeof point === 'string' ? point : JSON.stringify(point)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Sentiment reasoning section */}
            {email.sentement_reason && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Sentiment Analysis</h3>
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  {email.sentement_reason}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Email not found</p>
            <Button onClick={handleClose} className="mt-4">Go Back</Button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
