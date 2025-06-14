import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Call, Conversation, Participant } from '../types';
import { Phone, MessageSquare, Clock, Calendar, User, Users, Mail } from 'lucide-react';
import { createClient } from "@/utils/supabase/client";

// Define Email type
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

interface CommunicationTabsProps {
  conversations: Conversation[];
  calls: Call[];
  participants: Record<string, Participant[]>;
  isLoading: boolean;
  error: string | null;
  onReloadCalls: () => Promise<void>;
  formatDate: (date: string | null) => string;
  formatDuration: (seconds: number | null) => string;
}

export const CommunicationTabs: React.FC<CommunicationTabsProps> = ({
  conversations,
  calls,
  participants,
  isLoading,
  error,
  onReloadCalls,
  formatDate,
  formatDuration
}) => {
  const router = useRouter();
  const supabase = createClient();
  
  // State for emails
  const [emails, setEmails] = useState<Email[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [emailsError, setEmailsError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  
  // Get the customerId from URL
  const customerId = window.location.pathname.split('/').pop() || '';
  
  // Load emails for this customer with contact information
  const loadEmails = async () => {
    if (!customerId) return;
    
    setEmailsLoading(true);
    setEmailsError(null);
    
    try {
      // Get emails for this customer
      const { data: emailsData, error: emailsError } = await supabase
        .from('email')
        .select('*')
        .eq('company_id', customerId)
        .order('created_at', { ascending: false });
      
      if (emailsError) throw emailsError;
      
      if (!emailsData || emailsData.length === 0) {
        setEmails([]);
        setEmailsLoading(false);
        return;
      }
      
      // Get all unique contact IDs from the emails
      const contactIds = Array.from(
        new Set(emailsData.map(email => email.contact_id).filter(Boolean))
      );
      
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
        // We already know the company name because we're in the customer's context
        contact_name: email.contact_id ? contactMap[email.contact_id] || 'Unknown Contact' : null
      }));
      
      setEmails(enrichedEmails);
    } catch (err: any) {
      console.error('Error loading emails:', err);
      setEmailsError(err.message || 'Failed to load emails');
    } finally {
      setEmailsLoading(false);
    }
  };
  
  // Load emails on component mount
  useEffect(() => {
    loadEmails();
  }, [customerId]);
  
  // Check if data is already available when component mounts
  useEffect(() => {
    // If we already have data, we should not be in a loading state
    if (calls.length > 0 && isLoading) {
      console.log('Data already available, skipping loading state');
      // Don't call onReloadCalls here as it can cause an infinite loop
      // Just let the parent component know it should update its loading state
      // on next render
    }
  }, []);
  
  // Function to navigate to call details page
  const navigateToCallDetails = (callId: string) => {
    router.push(`/calls/${callId}`);
  };
  
  // Function to navigate to conversation details page
  const navigateToConversationDetails = (conversationId: string) => {
    router.push(`/conversations/${conversationId}`);
  };

  return (
    <Card className="mt-8 shadow-md">
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-slate-500" />
          Communication History
          {error && (
            <button
              onClick={onReloadCalls}
              className="ml-auto text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Reload</span>
            </button>
          )}
        </h3>
      </div>
      
      <CardContent className="p-6">
        <Tabs defaultValue="conversations" className="w-full">
          <TabsList className="mb-4 w-full grid grid-cols-3 h-auto">
            <TabsTrigger value="conversations" className="py-2 data-[state=active]:shadow-md">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>Conversations</span>
                <Badge variant="secondary" className="ml-2 bg-slate-100 hover:bg-slate-100">{conversations.length}</Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger value="activities" className="py-2 data-[state=active]:shadow-md">
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <span>Calls</span>
                <Badge variant="secondary" className="ml-2 bg-slate-100 hover:bg-slate-100">{calls.length}</Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger value="emails" className="py-2 data-[state=active]:shadow-md">
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <span>Emails</span>
                <Badge variant="secondary" className="ml-2 bg-slate-100 hover:bg-slate-100">{emails.length}</Badge>
              </div>
            </TabsTrigger>
            </TabsList>

            <TabsContent value="conversations" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-2">{error}</p>
                  <button
                    onClick={onReloadCalls}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    Try again
                  </button>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center p-6 bg-slate-50 rounded-lg border border-slate-100">
                  <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No conversations found for this customer.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Platform
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {conversations.map((conversation) => (
                        <tr 
                          key={conversation.id} 
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => navigateToConversationDetails(conversation.id)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-blue-600 hover:underline">{conversation.title}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100">
                              {conversation.platform_type || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              {conversation.is_group ? (
                                <>
                                  <Users className="h-3 w-3" />
                                  <span>Group</span>
                                </>
                              ) : (
                                <>
                                  <User className="h-3 w-3" />
                                  <span>Direct</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge className={
                              conversation.status === 'active' ? 'bg-green-50 text-green-700 hover:bg-green-50 border-green-100' :
                              conversation.status === 'archived' ? 'bg-slate-50 text-slate-700 hover:bg-slate-50 border-slate-100' :
                              'bg-yellow-50 text-yellow-700 hover:bg-yellow-50 border-yellow-100'
                            }>
                              {conversation.status || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(conversation.created_at)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="activities" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-2">{error}</p>
                  <button
                    onClick={onReloadCalls}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    Try again
                  </button>
                </div>
              ) : calls.length === 0 ? (
                <div className="text-center p-6 bg-slate-50 rounded-lg border border-slate-100">
                  <Phone className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No activities found for this customer.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Participants
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {calls.map((call) => (
                        <tr 
                          key={call.id} 
                          className="hover:bg-slate-50 transition-colors cursor-pointer" 
                          onClick={() => navigateToCallDetails(call.id)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-blue-600 hover:underline">
                              {call.name || 'Untitled Call'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100">
                              {call.status || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(call.duration)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {participants[call.id] ? participants[call.id].length : 0} participants
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(call.created_at)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="emails" className="space-y-4">
              {emailsLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : emailsError ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-2">{emailsError}</p>
                  <button
                    onClick={loadEmails}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    Try again
                  </button>
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center p-6 bg-slate-50 rounded-lg border border-slate-100">
                  <Mail className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No emails found for this customer.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Sender
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Content
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Sentiment
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {emails.map((email) => (
                        <tr 
                          key={email.id} 
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/emails/${email.id}`)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-blue-600 hover:underline">
                              {email.sender_email}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-slate-500">
                              {email.contact_name || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-500 truncate max-w-xs">
                              {email.email_body ? email.email_body.substring(0, 100) + '...' : 'No content'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge className={
                              email.sentiment && email.sentiment > 0.60 ? 'bg-green-50 text-green-700 hover:bg-green-50 border-green-100' :
                              email.sentiment && email.sentiment >= 0.40 ? 'bg-blue-50 text-blue-800 hover:bg-blue-50 border-blue-100' :
                              'bg-red-50 text-red-700 hover:bg-red-50 border-red-100'
                            }>
                              {email.sentiment && email.sentiment > 0.60 ? 'Positive' :
                               email.sentiment && email.sentiment >= 0.40 ? 'Neutral' : 'Negative'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(email.created_at)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
      </CardContent>
    </Card>
  );
};
