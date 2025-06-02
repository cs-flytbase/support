"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { X, Mail, User, Building, Clock, ArrowLeft } from 'lucide-react';

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

// Define the proper PageProps type for Next.js
type EmailDetailPageProps = {
  params: { id: string }
}

export default function EmailDetailPage({ params }: EmailDetailPageProps) {
  // Access params directly with proper typing
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
  useEffect(() => {
    const loadEmail = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch the email by ID
        const { data, error: emailError } = await supabase
          .from('email')
          .select('*')
          .eq('id', params.id)
          .single();
        
        if (emailError) throw emailError;
        
        if (!data) {
          setError('Email not found');
          setIsLoading(false);
          return;
        }
        
        // If we have company_id or contact_id, fetch the details
        let companyName = data.company_name;
        let contactName = data.contact_name;
        
        // If company_id exists but company_name doesn't, fetch it
        if (data.company_id && !data.company_name) {
          const { data: companyData, error: companyError } = await supabase
            .from('customers')
            .select('name')
            .eq('id', data.company_id)
            .single();
          
          if (!companyError && companyData) {
            companyName = companyData.name;
          }
        }
        
        // If contact_id exists but contact_name doesn't, fetch it
        if (data.contact_id && !data.contact_name) {
          const { data: contactData, error: contactError } = await supabase
            .from('customer_contacts')
            .select('name')
            .eq('id', data.contact_id)
            .single();
          
          if (!contactError && contactData) {
            contactName = contactData.name;
          }
        }
        
        // Set the email with potentially updated fields
        setEmail({
          ...data,
          company_name: companyName,
          contact_name: contactName
        });
      } catch (err: any) {
        console.error('Error loading email:', err);
        setError(err.message || 'Failed to load email details');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEmail();
  }, [params.id, supabase]);
  
  // Get sentiment badge
  const getSentimentBadge = (sentiment: number | null) => {
    if (sentiment === null) return 'Unknown';
    
    if (sentiment >= 70) return 'Positive';
    if (sentiment >= 40) return 'Neutral';
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
  
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex justify-end">
      <div className="bg-white w-full max-w-md p-6 overflow-y-auto h-full shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" size="icon" onClick={handleClose} className="-ml-2">
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-semibold">Email Details</h2>
          <div className="w-8"></div> {/* Spacer for alignment */}
        </div>
        
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
                    <p className="text-sm">{email.company_name}</p>
                  </div>
                </div>
              )}
              
              {email.contact_name && (
                <div className="flex items-start gap-2">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Contact</h3>
                    <p className="text-sm">{email.contact_name}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-500">Sentiment:</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColorClass(email.sentiment)}`}>
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
  );
}
