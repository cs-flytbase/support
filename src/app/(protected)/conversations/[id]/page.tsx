'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, MessageSquare, Bot, ArrowLeft, RefreshCcw, Download, Loader2, Users, Link2, Unlink, Building, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  conversation_id: string;
  sender_id?: string;
  content: string;
  created_at: string;
  is_from_me: boolean;
  metadata?: any;
}

interface ConversationDetails {
  id: string;
  title: string;
  platform_type: string;
  is_group: boolean;
  metadata?: any;
  created_at: string;
  participants?: any[];
  chat_id?: string;
  api?: string; // UUID reference to api_keys table
  customer_id?: string; // Reference to customers table
  conversation_members?: Array<{
    id: string;
    name?: string;
    phone_number?: string;
    external_id?: string;
    is_admin?: boolean;
    avatar_url?: string | null;
    metadata?: any;
    created_at?: string;
    updated_at?: string;
    type?: string; // 'agent' or 'customer_contact'
    agent_id?: string; // Reference to agents table
    contact_id?: string; // Reference to customer_contacts table
  }>;
}

interface Agent {
  id: string;
  name: string;
  webhook_url: string;
  description?: string;
  is_active: boolean;
}

interface SupportAgent {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  title: string;
  status: string;
  hire_date?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface CustomerContact {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  is_primary: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  customer_type: string | null;
  created_at: string;
  updated_at: string;
}

// Update the component to accept params as props
export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const { user: clerkUser, isLoaded } = useUser();
  const supabase = createClient();
  
  // State for safely handling the conversation ID
  const [conversationId, setConversationId] = useState<string>('');
  
  // Extract the ID from params when the component mounts
  useEffect(() => {
    // This is a safe way to access params in a client component
    if (params && typeof params === 'object' && 'id' in params) {
      setConversationId(params.id);
    }
  }, [params]);
  
  // State variables
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [assignedAgents, setAssignedAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  
  // Customer related state
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);

  // Member connection related state
  const [memberConnectionDialogOpen, setMemberConnectionDialogOpen] = useState(false);
  type MemberType = {
    id: string;
    name?: string;
    phone_number?: string;
    external_id?: string;
    is_admin?: boolean;
    avatar_url?: string | null;
    metadata?: any;
    created_at?: string;
    updated_at?: string;
    type?: string;
    agent_id?: string;
    contact_id?: string;
  };
  const [selectedMember, setSelectedMember] = useState<MemberType | null>(null);
  const [connectionType, setConnectionType] = useState<'agent' | 'customer_contact'>('agent');
  const [supportAgents, setSupportAgents] = useState<SupportAgent[]>([]);
  const [customerContacts, setCustomerContacts] = useState<CustomerContact[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionSearchTerm, setConnectionSearchTerm] = useState('');

  // Load conversation details and messages
  useEffect(() => {
    if (isLoaded && clerkUser && conversationId) {
      fetchConversationData();
    }
  }, [isLoaded, clerkUser, conversationId]);

  const fetchConversationData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // First, get the user's Supabase ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUser?.id)
        .single();
        
      if (userError) throw new Error('Failed to authenticate user');
      
      // Fetch conversation details
      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .select('*, conversation_members(id, name, external_id, is_admin, avatar_url, metadata, created_at, updated_at, type, agent_id, contact_id)')
        .eq('id', conversationId)
        .eq('user_id', userData.id)
        .single();
        
      if (convError) throw new Error('Failed to load conversation details');
      setConversation(conversationData);
      
      // Fetch messages for this conversation
      const { data: messagesData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (msgError) throw new Error('Failed to load messages');
      setMessages(messagesData || []);
      
      // Fetch available AI agents
      const { data: agentsData, error: agentError } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('user_id', userData.id)
        .eq('is_active', true);
        
      if (agentError) throw new Error('Failed to load AI agents');
      setAvailableAgents(agentsData || []);
      
      // Fetch assigned agents for this conversation
      const { data: assignedAgentsData, error: assignedError } = await supabase
        .from('conversation_agents')
        .select('*, agent:agent_id(*)')
        .eq('conversation_id', conversationId);
        
      if (assignedError) throw new Error('Failed to load assigned agents');
      
      // Extract the agent objects from the joined results
      const agentsArray = assignedAgentsData 
        ? assignedAgentsData.map(item => item.agent) 
        : [];
      
      setAssignedAgents(agentsArray);

      // Fetch customer information if customer_id exists
      if (conversationData.customer_id) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', conversationData.customer_id)
          .single();

        if (!customerError && customerData) {
          setCustomer(customerData);
          setSelectedCustomerId(customerData.id);
        }
      }

      // Fetch all available customers for the dropdown
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (!customersError) {
        setCustomers(customersData || []);
      }
      
      // Fetch all support agents for member connection
      const { data: supportAgentsData, error: supportAgentsError } = await supabase
        .from('agents')
        .select('*')
        .order('name', { ascending: true });
      
      if (!supportAgentsError) {
        console.log('Loaded agents:', supportAgentsData?.length || 0);
        setSupportAgents(supportAgentsData || []);
      } else {
        console.error('Error fetching agents:', supportAgentsError);
      }
      
      // Fetch all customer contacts for member connection
      const { data: contactsData, error: contactsError } = await supabase
        .from('customer_contacts')
        .select('*, customer:customer_id(*)')
        .order('name', { ascending: true });
      
      if (!contactsError) {
        console.log('Loaded contacts:', contactsData?.length || 0);
        setCustomerContacts(contactsData || []);
      } else {
        console.error('Error fetching contacts:', contactsError);
      }
    } catch (err) {
      console.error('Error loading conversation data:', err);
      setError('Failed to load conversation data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle opening the member connection dialog
  const handleMemberClick = async (member: any) => {
    console.log('Selected member:', member);
    
    setSelectedMember(member);
    
    // If the member is already connected, pre-select the connection type and entity
    if (member.type === 'agent' && member.agent_id) {
      setConnectionType('agent');
      setSelectedEntityId(member.agent_id);
    } else if (member.type === 'customer_contact' && member.contact_id) {
      setConnectionType('customer_contact');
      setSelectedEntityId(member.contact_id);
    } else {
      // Default to agent if not connected
      setConnectionType('agent');
      setSelectedEntityId('');
    }
    
    // Fetch all agents and contacts immediately to ensure they're loaded
    try {
      // Fetch agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .order('name', { ascending: true });
      
      if (agentsError) {
        console.error('Error fetching agents:', agentsError);
      } else {
        console.log(`Loaded ${agentsData?.length || 0} agents on dialog open`);
        setSupportAgents(agentsData || []);
      }
      
      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('customer_contacts')
        .select('*, customer:customer_id(*)')
        .order('name', { ascending: true });
      
      if (contactsError) {
        console.error('Error fetching contacts:', contactsError);
      } else {
        console.log(`Loaded ${contactsData?.length || 0} contacts on dialog open`);
        setCustomerContacts(contactsData || []);
      }
    } catch (err) {
      console.error('Error loading agents/contacts:', err);
    }
    
    setMemberConnectionDialogOpen(true);
  };
  
  // Connect or update a member's connection
  const connectMember = async () => {
    if (!selectedMember || !selectedEntityId) {
      return;
    }
    
    setConnectionLoading(true);
    
    try {
      const updates = {
        type: connectionType,
        agent_id: connectionType === 'agent' ? selectedEntityId : null,
        contact_id: connectionType === 'customer_contact' ? selectedEntityId : null
      };
      
      const { error } = await supabase
        .from('conversation_members')
        .update(updates)
        .eq('id', selectedMember?.id || '');
      
      if (error) throw error;
      
      // Refresh the data
      await fetchConversationData();
      setMemberConnectionDialogOpen(false);
    } catch (err: any) {
      console.error('Error connecting member:', err);
      setError(`Failed to connect member: ${err.message}`);
    } finally {
      setConnectionLoading(false);
    }
  };
  
  // Disconnect a member
  const disconnectMember = async () => {
    if (!selectedMember) {
      return;
    }
    
    if (!confirm('Are you sure you want to remove this connection?')) {
      return;
    }
    
    setConnectionLoading(true);
    
    try {
      const { error } = await supabase
        .from('conversation_members')
        .update({
          type: null,
          agent_id: null,
          contact_id: null
        })
        .eq('id', selectedMember?.id || '');
      
      if (error) throw error;
      
      // Refresh the data
      await fetchConversationData();
      setMemberConnectionDialogOpen(false);
    } catch (err: any) {
      console.error('Error disconnecting member:', err);
      setError(`Failed to disconnect member: ${err.message}`);
    } finally {
      setConnectionLoading(false);
    }
  };
  
  const assignAgentToConversation = async () => {
    if (!selectedAgentId || !conversation) {
      return;
    }
    
    setAgentLoading(true);
    
    try {
      // Check if already assigned
      const isAlreadyAssigned = assignedAgents.some(agent => agent.id === selectedAgentId);
      
      if (isAlreadyAssigned) {
        setError('This agent is already assigned to this conversation');
        setAgentLoading(false);
        return;
      }
      
      // Create the link between conversation and agent
      const { error } = await supabase
        .from('conversation_agents')
        .insert({
          conversation_id: conversation.id,
          agent_id: selectedAgentId
        });
        
      if (error) throw error;
      
      // Refresh the list of assigned agents
      fetchConversationData();
    } catch (err: any) {
      console.error('Error assigning agent:', err);
      setError(`Failed to assign agent: ${err.message}`);
    } finally {
      setAgentLoading(false);
    }
  };
  
  const removeAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to remove this agent from the conversation?')) {
      return;
    }
    
    setAgentLoading(true);
    
    try {
      const { error } = await supabase
        .from('conversation_agents')
        .delete()
        .match({
          conversation_id: conversationId,
          agent_id: agentId
        });
        
      if (error) throw error;
      
      // Refresh the list of assigned agents
      fetchConversationData();
    } catch (err: any) {
      console.error('Error removing agent:', err);
      setError(`Failed to remove agent: ${err.message}`);
    } finally {
      setAgentLoading(false);
    }
  };

  // Function to assign a customer to the conversation
  const assignCustomerToConversation = async () => {
    if (!selectedCustomerId || !conversation) {
      return;
    }
    
    setCustomerLoading(true);
    
    try {
      // SIMPLE APPROACH: Directly update the conversation with the customer ID
      const { error } = await supabase
        .from('conversations')
        .update({ customer_id: selectedCustomerId }) // Use the customer ID directly
        .eq('id', conversation.id);
        
      if (error) throw error;
      
      // Get the customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', selectedCustomerId)
        .single();
        
      if (customerError) throw customerError;
      
      // Update local state
      setCustomer(customerData);
      setCustomerDialogOpen(false);
      
      // Update the conversation object in state
      setConversation(prev => {
        if (!prev) return null;
        return { ...prev, customer_id: selectedCustomerId };
      });
    } catch (err: any) {
      console.error('Error assigning customer:', err);
      setError(`Failed to assign customer: ${err.message}`);
    } finally {
      setCustomerLoading(false);
    }
  };
  
  // Import messages from Periskope API
  const importMessagesFromPeriskope = async () => {
    if (!conversation || !clerkUser) return;
    
    setImportLoading(true);
    setImportMessage('');
    setError('');
    
    try {
      // First, get the user's Supabase ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUser?.id)
        .single();
        
      if (userError) throw new Error('Failed to authenticate user');

      if (!conversation.chat_id) {
        throw new Error('This conversation does not have a Periskope chat ID');
      }
      
      if (!conversation.api) {
        throw new Error('This conversation is not linked to an API key');
      }
      
      // Get API key directly from the linked API key record
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('id', conversation.api)
        .single();
        
      if (apiKeyError) throw new Error(`No API key found for this conversation`);
      
      // Call the Periskope API to fetch messages
      const response = await fetch(`/api/periskope/import-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          platformType: conversation.platform_type,
          periskopeApiKey: apiKeyData.api_key,
          periskopeChatId: conversation.chat_id,
          userId: userData.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import messages from Periskope');
      }
      
      const result = await response.json();
      
      // Update the UI with success message and refresh messages
      setImportMessage(`Successfully imported ${result.importedCount} messages`);
      fetchConversationData(); // Refresh to show newly imported messages
      
    } catch (err: any) {
      console.error('Error importing messages from Periskope:', err);
      setError(`Failed to import messages: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (!conversation) {
    return (
      <div className="p-8">
        <Alert className="bg-red-50">
          <AlertDescription>
            Conversation not found or you don't have access to view it.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/conversations" className="text-blue-600 hover:underline flex items-center gap-1">
            <ArrowLeft size={16} /> Back to conversations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/conversations" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-bold">{conversation.title}</h1>
          {conversation.is_group && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Group</span>}
          <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded capitalize">{conversation.platform_type}</span>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={importMessagesFromPeriskope} 
            disabled={importLoading}
            className="gap-1"
          >
            {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
            Import from Periskope
          </Button>
          <Button size="sm" variant="outline" onClick={fetchConversationData} className="gap-1">
            <RefreshCcw size={14} /> Refresh
          </Button>
        </div>
      </div>
      
      {importMessage && (
        <Alert className="mb-4 bg-green-50">
          <AlertDescription>{importMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Messages Section */}
        <div className="col-span-2">
          <Card className="h-[calc(100vh-200px)] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Messages</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto pb-6">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <p>No messages found in this conversation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...messages].reverse().map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.is_from_me ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.is_from_me
                            ? 'bg-blue-500 text-white rounded-tr-none'
                            : 'bg-gray-100 rounded-tl-none'
                        }`}
                      >
                        {message.content}
                        <div
                          className={`text-xs mt-1 ${
                            message.is_from_me ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {new Date(message.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info and AI Agents Section */}
        <div className="col-span-1">
          <Tabs defaultValue="members">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="agents">AI Agents</TabsTrigger>
            </TabsList>

            
            <TabsContent value="details" className="mt-4">
              {conversation && (
                <Card>
                  <CardHeader>
                    <CardTitle>Conversation Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Title</h4>
                        <p className="text-base">{conversation.title || 'Untitled'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Platform</h4>
                        <p className="text-base capitalize">{conversation.platform_type}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Created</h4>
                        <p className="text-base">{new Date(conversation.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Group Chat</h4>
                        <p className="text-base">{conversation.is_group ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                    
                    {/* Customer information */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-3">Customer</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          {customer ? (
                            <div className="flex items-center space-x-3 p-3 border rounded-md">
                              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                <User className="h-6 w-6 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-gray-500">{customer.email || 'No email'} | {customer.phone || 'No phone'}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">No customer assigned</p>
                          )}
                        </div>
                        <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              onClick={() => setCustomerDialogOpen(true)}
                            >
                              {customer ? 'Change Customer' : 'Assign Customer'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>Assign Customer to Conversation</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                              <div className="mb-4">
                                <label htmlFor="customerSearch" className="block text-sm font-medium text-gray-700 mb-1">
                                  Search Customers
                                </label>
                                <input
                                  type="text"
                                  id="customerSearch"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Search by name or email..."
                                  value={customerSearchTerm}
                                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                />
                              </div>
                              
                              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select a customer" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                  {customers
                                    .filter(c => 
                                      c.name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                      (c.email && c.email.toLowerCase().includes(customerSearchTerm.toLowerCase()))
                                    )
                                    .map(c => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.name} {c.email ? `(${c.email})` : ''}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setCustomerDialogOpen(false)}>Cancel</Button>
                              <Button 
                                onClick={assignCustomerToConversation} 
                                disabled={!selectedCustomerId || customerLoading}
                              >
                                {customerLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Assigning...
                                  </>
                                ) : (
                                  'Assign Customer'
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    
                    {/* Conversation members - Enhanced display */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium">Conversation Members ({conversation.conversation_members?.length || 0})</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            fetchConversationData();
                          }}
                          className="text-xs"
                        >
                          <RefreshCcw size={12} className="mr-1" /> Refresh
                        </Button>
                      </div>
                      
                      {!conversation.conversation_members || conversation.conversation_members.length === 0 ? (
                        <div className="p-4 border rounded-md bg-gray-50 text-center">
                          <p className="text-gray-500">No members found for this conversation</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <th className="px-4 py-2 border-b">Member</th>
                                <th className="px-4 py-2 border-b">External ID</th>
                                <th className="px-4 py-2 border-b">Role</th>
                                <th className="px-4 py-2 border-b">Joined</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {conversation.conversation_members.map((member) => {
                                // Parse metadata if available
                                const metadata = member.metadata ? (typeof member.metadata === 'string' ? JSON.parse(member.metadata) : member.metadata) : {};
                                
                                return (
                                  <tr key={member.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                          {member.avatar_url ? (
                                            <img 
                                              src={member.avatar_url} 
                                              alt={member.name || 'Participant'} 
                                              className="h-10 w-10 rounded-full object-cover"
                                            />
                                          ) : (
                                            <User className="h-6 w-6 text-gray-500" />
                                          )}
                                        </div>
                                        <div>
                                          <p className="font-medium">{member.name || 'Unknown'}</p>
                                          <p className="text-xs text-gray-500">{metadata.phone_number || member.phone_number || 'No phone number'}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-sm">{member.external_id || 'N/A'}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {member.is_admin ? (
                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Admin</span>
                                      ) : (
                                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Member</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                      {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'Unknown'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    
                    {/* AI Agents assigned to this conversation */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-3">Assigned AI Agents</h4>
                      
                      {assignedAgents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {assignedAgents.map(agent => (
                            <div key={agent.id} className="flex items-center justify-between p-3 border rounded-md">
                              <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Bot className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{agent.name}</p>
                                  <p className="text-sm text-gray-500 truncate max-w-[200px]">{agent.description || 'No description'}</p>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeAgent(agent.id)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No agents assigned yet</p>
                      )}
                      
                      <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                          <SelectTrigger className="w-full sm:w-[250px]">
                            <SelectValue placeholder="Select an AI agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableAgents.map(agent => (
                              <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={assignAgentToConversation}
                          disabled={!selectedAgentId || agentLoading}
                        >
                          {agentLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Assigning...
                            </>
                          ) : (
                            'Assign Agent'
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* New Members Tab */}
            <TabsContent value="members" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users size={18} />
                    Conversation Members
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    {conversation.conversation_members?.length || 0} participants in this conversation
                  </p>
                </CardHeader>
                <CardContent>
                  {!conversation.conversation_members || conversation.conversation_members.length === 0 ? (
                    <div className="p-4 border rounded-md bg-gray-50 text-center">
                      <p className="text-gray-500">No members found for this conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Member stats */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-blue-700">Total Members</h3>
                          <p className="text-2xl font-bold">{conversation.conversation_members.length}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-green-700">Admins</h3>
                          <p className="text-2xl font-bold">
                            {conversation.conversation_members.filter(m => m.is_admin).length}
                          </p>
                        </div>
                      </div>
                      
                      {/* Member list with detailed information */}
                      <div className="overflow-hidden border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Member
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                External ID
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Joined
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Updated
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {conversation.conversation_members.map((member) => {
                              // Parse metadata if available
                              const metadata = member.metadata ? (typeof member.metadata === 'string' ? JSON.parse(member.metadata) : member.metadata) : {};
                              
                              return (
                                <tr 
                                  key={member.id} 
                                  className="hover:bg-gray-50 cursor-pointer"
                                  onClick={() => handleMemberClick(member)}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                        {member.avatar_url ? (
                                          <img className="h-10 w-10 rounded-full object-cover" src={member.avatar_url} alt="" />
                                        ) : (
                                          <User className="h-6 w-6 text-gray-500" />
                                        )}
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
                                          {member.name || 'Unknown'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {metadata?.phone_number || 'No phone number'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="max-w-[150px] truncate" title={member.external_id || 'N/A'}>
                                      {member.external_id || 'N/A'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      {member.is_admin ? (
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                          Admin
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                          Member
                                        </span>
                                      )}
                                      
                                      {member.type && (
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${member.type === 'agent' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                                          {member.type === 'agent' ? 'Agent' : 'Customer Contact'}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {member.created_at ? new Date(member.created_at).toLocaleString() : 'Unknown'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {member.updated_at ? new Date(member.updated_at).toLocaleString() : 'Unknown'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Additional metadata if available */}
                      {conversation.conversation_members.some(m => m.metadata) && (
                        <div className="mt-6">
                          <h3 className="text-sm font-medium mb-2">Member Metadata</h3>
                          <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metadata</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {conversation.conversation_members.filter(m => m.metadata).map((member) => {
                                    const metadata = member.metadata ? (typeof member.metadata === 'string' ? JSON.parse(member.metadata) : member.metadata) : {};
                                    return (
                                      <tr key={`${member.id}-metadata`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <div className="text-sm font-medium text-gray-900">
                                              {member.name || 'Unknown'}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4">
                                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-[100px] overflow-y-auto">
                                            {JSON.stringify(metadata, null, 2)}
                                          </pre>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="agents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">AI Agents</CardTitle>
                  <div className="text-sm text-gray-500">Manage AI agents for this conversation</div>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert className="mb-4 bg-red-50">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-2">Add Agent</h3>
                    {availableAgents.length === 0 ? (
                      <p className="text-sm text-gray-500 mb-2">
                        No AI agents available. Create agents in the Settings page.
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <Select
                          value={selectedAgentId}
                          onValueChange={setSelectedAgentId}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableAgents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={assignAgentToConversation} 
                          disabled={!selectedAgentId || agentLoading}
                          className="whitespace-nowrap"
                        >
                          Add Agent
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Assigned Agents</h3>
                    {assignedAgents.length === 0 ? (
                      <p className="text-sm text-gray-500">No agents assigned to this conversation</p>
                    ) : (
                      <div className="space-y-3">
                        {assignedAgents.map((agent) => (
                          <div key={agent.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                            <div className="flex items-center gap-2">
                              <Bot size={18} className="text-blue-500" />
                              <div>
                                <p className="font-medium">{agent.name}</p>
                                <p className="text-xs text-gray-500">{agent.webhook_url}</p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700"
                              onClick={() => removeAgent(agent.id)}
                              disabled={agentLoading}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Member Connection Dialog */}
      <Dialog open={memberConnectionDialogOpen} onOpenChange={setMemberConnectionDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 size={18} />
              {selectedMember?.type ? 'Update Member Connection' : 'Connect Member'}
            </DialogTitle>
          </DialogHeader>
          
          {error && (
            <Alert className="bg-red-50 mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-6 py-4">
            {/* Member info */}
            {selectedMember && (
              <div className="flex items-center space-x-4 p-4 border rounded-md bg-gray-50">
                <div className="h-14 w-14 bg-gray-200 rounded-full flex items-center justify-center">
                  {selectedMember.avatar_url ? (
                    <img 
                      src={selectedMember.avatar_url} 
                      alt={selectedMember.name || 'Member'} 
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-gray-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-lg">{selectedMember.name || 'Unknown Member'}</h3>
                  <p className="text-sm text-gray-500">{selectedMember.external_id || 'No external ID'}</p>
                  {selectedMember.type && selectedMember.type === 'agent' && (
                    <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Connected as Agent
                    </div>
                  )}
                  {selectedMember.type && selectedMember.type === 'customer_contact' && (
                    <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Connected as Customer Contact
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Connection Type</h3>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="agent-type" 
                      name="connection-type" 
                      checked={connectionType === 'agent'} 
                      onChange={() => setConnectionType('agent')} 
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="agent-type" className="text-sm font-medium text-gray-700">
                      Support Agent
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="contact-type" 
                      name="connection-type" 
                      checked={connectionType === 'customer_contact'} 
                      onChange={() => setConnectionType('customer_contact')} 
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="contact-type" className="text-sm font-medium text-gray-700">
                      Customer Contact
                    </Label>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">
                    {connectionType === 'agent' ? 'Select Support Agent' : 'Select Customer Contact'}
                  </h3>
                  <div className="relative">
                    <Input 
                      type="text" 
                      placeholder="Search..." 
                      value={connectionSearchTerm} 
                      onChange={(e) => setConnectionSearchTerm(e.target.value)} 
                      className="w-[200px] text-sm"
                    />
                  </div>
                </div>
                
                <div className="border rounded-md overflow-hidden max-h-[250px] overflow-y-auto">
                  {connectionType === 'agent' ? (
                    <div className="divide-y">
                      {supportAgents.length > 0 ? (
                        supportAgents
                          .filter(agent => 
                            !connectionSearchTerm || 
                            (agent.name && agent.name.toLowerCase().includes(connectionSearchTerm.toLowerCase())) || 
                            (agent.email && agent.email.toLowerCase().includes(connectionSearchTerm.toLowerCase()))
                          )
                          .map(agent => (
                            <div 
                              key={agent.id} 
                              className={`p-3 flex items-center space-x-3 hover:bg-gray-50 cursor-pointer ${selectedEntityId === agent.id ? 'bg-blue-50' : ''}`}
                              onClick={() => setSelectedEntityId(agent.id)}
                            >
                              <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                <UserCheck className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{agent.name || 'Unnamed Agent'}</p>
                                <p className="text-sm text-gray-500 truncate">
                                  {agent.email || 'No email'} 
                                  {agent.role || agent.title ? ` • ${agent.role || agent.title}` : ''}
                                </p>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          Loading agents...
                        </div>
                      )}
                      
                      {supportAgents.length > 0 && supportAgents.filter(agent => 
                        !connectionSearchTerm || 
                        (agent.name && agent.name.toLowerCase().includes(connectionSearchTerm.toLowerCase())) || 
                        (agent.email && agent.email.toLowerCase().includes(connectionSearchTerm.toLowerCase()))
                      ).length === 0 && (
                        <div className="p-4 text-center text-gray-500">
                          No agents found matching your search
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {customerContacts.length > 0 ? (
                        customerContacts
                          .filter(contact => 
                            !connectionSearchTerm || 
                            (contact.name && contact.name.toLowerCase().includes(connectionSearchTerm.toLowerCase())) || 
                            (contact.email && contact.email.toLowerCase().includes(connectionSearchTerm.toLowerCase())) ||
                            (contact.customer?.name && contact.customer.name.toLowerCase().includes(connectionSearchTerm.toLowerCase()))
                          )
                          .map(contact => (
                            <div 
                              key={contact.id} 
                              className={`p-3 flex items-center space-x-3 hover:bg-gray-50 cursor-pointer ${selectedEntityId === contact.id ? 'bg-blue-50' : ''}`}
                              onClick={() => setSelectedEntityId(contact.id)}
                            >
                              <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <Building className="h-5 w-5 text-purple-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{contact.name || 'Unnamed Contact'}</p>
                                <p className="text-sm text-gray-500 truncate">
                                  {contact.email || 'No email'}
                                  {contact.title ? ` • ${contact.title}` : ''}
                                  {contact.customer?.name ? ` • ${contact.customer.name}` : ''}
                                </p>
                                {contact.is_primary && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    Primary Contact
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          Loading customer contacts...
                        </div>
                      )}
                      
                      {customerContacts.length > 0 && customerContacts.filter(contact => 
                        !connectionSearchTerm || 
                        (contact.name && contact.name.toLowerCase().includes(connectionSearchTerm.toLowerCase())) || 
                        (contact.email && contact.email.toLowerCase().includes(connectionSearchTerm.toLowerCase())) ||
                        (contact.customer?.name && contact.customer.name.toLowerCase().includes(connectionSearchTerm.toLowerCase()))
                      ).length === 0 && (
                        <div className="p-4 text-center text-gray-500">
                          No customer contacts found matching your search
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <div>
              {selectedMember?.type && (
                <Button 
                  variant="outline" 
                  onClick={disconnectMember} 
                  disabled={connectionLoading}
                  className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Unlink size={16} />
                  Disconnect
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setMemberConnectionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={connectMember} 
                disabled={!selectedEntityId || connectionLoading}
              >
                {connectionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  selectedMember?.type ? 'Update Connection' : 'Connect Member'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
