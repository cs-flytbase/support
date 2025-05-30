'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/utils/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, Search, X } from 'lucide-react'
import ConversationCard from '@/components/ConversationCard'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ApiKey {
  id: string
  user_id: string
  platform: string
  api_key: string
  name: string
}

interface Chat {
  chat_id: string
  chat_name: string
  chat_type: string
  member_count: number
  chat_image: string | null
  latest_message: any
  members?: Record<string, {
    contact_id?: string
    contact_name?: string
    is_admin?: boolean
    contact_image?: string | null
  }>
  participants?: Array<{
    id?: string
    name?: string
    phone_number?: string
    is_admin?: boolean
    avatar_url?: string | null
  }>
}

// Interface for Customer data
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

const ConversationsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedApiKey, setSelectedApiKey] = useState<string>('')
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChats, setSelectedChats] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const { isSignedIn, user: clerkUser } = useUser()
  const supabase = createClient()
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null)
  
  // Customer search functionality
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false)
  
  // Fetch Supabase user ID
  useEffect(() => {
    const fetchSupabaseUserId = async () => {
      if (!isSignedIn || !clerkUser) return

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', clerkUser.id)
          .maybeSingle()

        if (error) throw error
        if (data) {
          setSupabaseUserId(data.id)
        }
      } catch (error) {
        console.error('Error fetching Supabase user:', error)
      }
    }

    fetchSupabaseUserId()
  }, [isSignedIn, clerkUser])  // Re-run when auth status changes
  
  // Fetch customers for linking
  useEffect(() => {
    if (supabaseUserId) {
      fetchCustomers()
    }
  }, [supabaseUserId])

  // Define fetchConversations function outside useEffect so we can call it elsewhere
  const fetchConversations = async () => {
    if (!supabaseUserId) return
    
    setIsLoadingConversations(true)
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        // .eq('user_id', supabaseUserId)
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      if (data) {
        setConversations(data)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }
  
  // Fetch user's conversations when supabaseUserId changes
  useEffect(() => {
    if (supabaseUserId) {
      fetchConversations()
    }
  }, [supabaseUserId, importSuccess]) // Refetch when importSuccess changes

  // Fetch WhatsApp API keys
  useEffect(() => {
    const fetchApiKeys = async () => {
      if (!supabaseUserId) return

      try {
        const { data, error } = await supabase
          .from('api_keys')
          .select('*')
          .eq('user_id', supabaseUserId)
          .eq('platform', 'whatsapp')

        if (error) throw error
        if (data) {
          setApiKeys(data)
        }
      } catch (error) {
        console.error('Error fetching API keys:', error)
      }
    }

    fetchApiKeys()
  }, [supabaseUserId])

  // Fetch chats from WhatsApp API
  const fetchChats = async () => {
    if (!selectedApiKey) {
      setError('Please select a WhatsApp account first')
      return
    }

    setIsLoading(true)
    setError('')
    setSelectedChats([]) // Clear selected chats when fetching new ones
    setImportSuccess(false) // Reset success message when fetching new chats

    try {
      // Find the selected API key object
      const apiKeyObj = apiKeys.find(key => key.id === selectedApiKey)
      if (!apiKeyObj) {
        throw new Error('Selected API key not found')
      }

      // Make the API request to fetch chats
      const response = await fetch('https://api.periskope.app/v1/chats?offset=0&limit=2000', {
        headers: {
          'Authorization': `Bearer ${apiKeyObj.api_key}`
        }
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const data = await response.json()
      setChats(data.chats || [])
    } catch (error) {
      console.error('Error fetching chats:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch chats')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch customers for search and linking
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  }
  
  // Search customers based on input
  const searchCustomers = (term: string) => {
    setCustomerSearchTerm(term);
    setIsSearchingCustomers(true);
    
    if (!term.trim()) {
      setFilteredCustomers([]);
      setIsSearchingCustomers(false);
      return;
    }
    
    const lowerTerm = term.toLowerCase();
    const results = customers.filter(customer => 
      customer.name.toLowerCase().includes(lowerTerm) ||
      (customer.email && customer.email.toLowerCase().includes(lowerTerm))
    );
    
    setFilteredCustomers(results.slice(0, 5)); // Limit to top 5 results
    setIsSearchingCustomers(false);
  }
  
  // Clear selected customer
  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setSelectedCustomerId('');
    setCustomerSearchTerm('');
  }
  
  // Import selected chats
  const importSelectedChats = async () => {
    if (selectedChats.length === 0) {
      setError('Please select at least one chat to import')
      return
    }
    
    if (!selectedCustomer) {
      setError('Please select a customer to link this conversation to')
      return
    }

    setIsImporting(true)
    setError('')
    setImportSuccess(false)
    
    console.log('Starting import of', selectedChats.length, 'conversations')

    try {
      // Get the full chat objects for the selected chat IDs
      const chatsToImport = chats.filter(chat => selectedChats.includes(chat.chat_id))
      
      console.log('Selected chat IDs:', selectedChats);
      console.log('Full chats to import:', chatsToImport);
      console.log('Using API key ID:', selectedApiKey);
      
      if (chatsToImport.length === 0) {
        throw new Error('No matching chats found for selected IDs');
      }
      
      // Detailed logging of the first chat structure to debug member data
      if (chatsToImport.length > 0) {
        console.log('DEBUG: First chat object structure:', JSON.stringify(chatsToImport[0], null, 2));
        console.log('DEBUG: Members object type:', typeof chatsToImport[0].members);
        if (chatsToImport[0].members) {
          console.log('DEBUG: Members keys:', Object.keys(chatsToImport[0].members));
          console.log('DEBUG: Sample member:', JSON.stringify(
            Object.values(chatsToImport[0].members)[0], null, 2)
          );
        }
      }
      
      // Call the API to import the selected chats
      console.log('Sending API request to import conversations...');
      const response = await fetch('/api/conversations/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKeyId: selectedApiKey,
          selectedChats: chatsToImport,
          customerId: selectedCustomer.id  // Always send the customerId
        })
      })

      console.log('API response status:', response.status);
      
      // Even if response is not ok, try to parse the response body for error details
      const responseBody = await response.text();
      console.log('API response body:', responseBody);
      
      let data;
      try {
        // Try to parse as JSON if possible
        data = JSON.parse(responseBody);
      } catch (parseError) {
        console.error('Error parsing response as JSON:', parseError);
        // If not valid JSON, use the raw text
        if (!response.ok) {
          throw new Error(`API error (${response.status}): ${responseBody || 'No response details'}`)
        }
      }
      
      if (!response.ok) {
        throw new Error(data?.error || `API error (${response.status})`);
      }

      console.log('Import response data:', data);
      
      if (data?.success) {
        setImportSuccess(true);
        setSelectedChats([]);
        
        // Create a direct entry in the database as a fallback
        // This ensures at least one conversation gets created
        try {
          console.log('Creating direct fallback entry in conversations table');
          const firstChat = chatsToImport[0];
          if (firstChat && supabaseUserId) {
            // Check if the conversation already exists first
            const { data: existingConv, error: checkError } = await supabase
              .from('conversations')
              .select('id')
              .eq('user_id', supabaseUserId)
              .eq('platform_type', 'whatsapp')
              .eq('chat_id', firstChat.chat_id)
              .maybeSingle();
              
            // Variable to store conversation data and error
            let directInsert;
            let directError;
              
            // If conversation already exists, use that instead of creating a new one
            if (existingConv && existingConv.id) {
              console.log('Conversation already exists, using existing ID:', existingConv.id);
              directInsert = existingConv;
              directError = null;
            } else {
              // Use upsert to handle the unique constraint
              const result = await supabase
                .from('conversations')
                .upsert({
                  user_id: supabaseUserId,
                  chat_id: firstChat.chat_id,
                  title: firstChat.chat_name,
                  platform_type: 'whatsapp',
                  is_group: firstChat.chat_type === 'group',
                  status: 'active',
                  updated_at: new Date().toISOString() // Force update of timestamp for existing records
                }, {
                  onConflict: 'user_id,platform_type,chat_id',
                  ignoreDuplicates: false // Update existing records
                })
                .select('id')
                .single();
                
              directInsert = result.data;
              directError = result.error;
            }
              
            if (directInsert) {
              console.log('Direct insert successful:', directInsert);
              
              // 1. Add conversation members to the conversations_member table
              console.log('Checking for members in firstChat:', firstChat);
              console.log('Members object:', firstChat.members);
              
              // Check if we have members data in different formats
              const membersData = firstChat.members || firstChat.participants || [];
              const hasMembers = membersData && (
                (typeof membersData === 'object' && Object.keys(membersData).length > 0) ||
                (Array.isArray(membersData) && membersData.length > 0)
              );
              
              if (hasMembers) {
                try {
                  console.log('Adding conversation members for conversation ID:', directInsert.id);
                  console.log('Members data:', membersData);
                  
                  // Convert members to array format regardless of input format
                  let memberRecords = [];
                  
                  if (Array.isArray(membersData)) {
                    // Handle array format
                    memberRecords = membersData.map(member => {
                      // Handle both participant format and member format
                      const externalId = member.id || (member as any).contact_id || `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                      const memberName = member.name || (member as any).contact_name || 'Unknown';
                      const phoneNumber = member.phone_number || (member as any).contact_id || '';
                      const isAdmin = member.is_admin || false;
                      const avatarUrl = member.avatar_url || (member as any).contact_image || null;
                      
                      return {
                        conversation_id: directInsert.id,
                        external_id: externalId,
                        name: memberName,
                        phone_number: phoneNumber,
                        is_admin: isAdmin,
                        avatar_url: avatarUrl,
                        created_at: new Date().toISOString()
                      };
                    });
                  } else {
                    // Handle object format with key-value pairs
                    memberRecords = Object.entries(membersData).map(([memberId, memberData]: [string, any]) => {
                      return {
                        conversation_id: directInsert.id,
                        external_id: memberId,
                        name: memberData?.contact_name || memberData?.name || 'Unknown',
                        phone_number: memberData?.contact_id || memberData?.phone_number || memberId,
                        is_admin: memberData?.is_admin || false,
                        avatar_url: memberData?.contact_image || memberData?.avatar_url || null,
                        created_at: new Date().toISOString()
                      };
                    });
                  }
                  
                  console.log('Prepared member records:', memberRecords);
                  
                  // Use individual inserts to avoid potential issues with bulk operations
                  if (memberRecords.length > 0) {
                    console.log(`Attempting to add ${memberRecords.length} members one by one...`);
                    let successCount = 0;
                    
                    for (const member of memberRecords) {
                      try {
                        // For debugging purposes, log each member insertion attempt
                        console.log('Inserting member:', member);
                        
                        const { data: insertedMember, error: singleError } = await supabase
                          .from('conversation_members')
                          .upsert(member, { 
                            onConflict: 'conversation_id,external_id',
                            ignoreDuplicates: false
                          })
                          .select();
                          
                        if (!singleError) {
                          successCount++;
                          console.log(`Successfully added member: ${member.name}`);
                        } else {
                          console.error(`Failed to add member ${member.external_id}:`, singleError);
                        }
                      } catch (err) {
                        console.error(`Exception for member ${member.external_id}:`, err);
                      }
                    }
                    
                    console.log(`Added ${successCount} out of ${memberRecords.length} members individually`);
                    
                    // Verify members were added
                    const { data: verifyMembers, error: verifyError } = await supabase
                      .from('conversation_members')
                      .select('*')
                      .eq('conversation_id', directInsert.id);
                      
                    if (!verifyError) {
                      console.log(`Verification: Found ${verifyMembers?.length || 0} members in database for this conversation`);
                    } else {
                      console.error('Error verifying members:', verifyError);
                    }
                  } else {
                    console.log('No valid member records created to add');
                  }
                } catch (membersError) {
                  console.error('Error processing conversation members:', membersError);
                }
              } else {
                console.log('No members data found in the chat object');
              }
              
              // Update the conversation with customer_id since we already have this column
              if (selectedCustomer && directInsert?.id) {
                try {
                  // Set the customer_id directly in the conversations table
                  // The schema already has a customer_id column
                  const { error: updateError } = await supabase
                    .from('conversations')
                    .update({
                      customer_id: selectedCustomer.id,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', directInsert.id);
                    
                  if (updateError) {
                    console.error('Error updating conversation with customer ID:', updateError);
                  } else {
                    console.log('Successfully linked customer to conversation');
                  }
                } catch (linkError) {
                  console.error('Error linking customer:', linkError);
                }
              }
            } else if (directError) {
              console.error('Direct insert error:', directError);
            }
          }
        } catch (fallbackError) {
          console.error('Fallback insert failed:', fallbackError);
        }
        
        // Close the modal after successful import
        setTimeout(() => {
          setIsModalOpen(false);
          // Reset selected customer
          setSelectedCustomer(null);
          // Refetch conversations
          fetchConversations();
        }, 1500);
      } else {
        throw new Error('Import failed: ' + (data?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error importing conversations:', error);
      setError(error instanceof Error ? error.message : 'Failed to import conversations');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <Button onClick={() => setIsModalOpen(true)}>Add Conversation</Button>
      </div>

      {/* Conversations list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoadingConversations ? (
          // Loading skeleton
          Array(6).fill(0).map((_, index) => (
            <div key={index} className="bg-gray-100 animate-pulse rounded-lg h-32"></div>
          ))
        ) : conversations.length > 0 ? (
          // Display conversations
          conversations.map(conversation => {
            // Extract data from the actual database schema
            const memberCount = conversation.is_group ? 
              (Object.keys(conversation.participants || {}).length || 0) :
              2; // 2 participants in individual chats
            
            return (
              <ConversationCard
                key={conversation.id}
                id={conversation.id}
                name={conversation.title}
                avatarUrl={conversation.metadata?.chat_image}
                platform={conversation.platform_type}
                type={conversation.is_group ? 'group' : 'user'}
                memberCount={memberCount}
                lastMessage={conversation.metadata?.latest_message?.body}
                lastMessageTimestamp={conversation.last_message_at}
                metadata={conversation.metadata}
              />
            );
          })
        ) : (
          // No conversations state
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
            <div className="text-gray-400 text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
            <p className="text-gray-500 mb-6">
              Get started by importing conversations from WhatsApp, Telegram, or other platforms.
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              Add Your First Conversation
            </Button>
          </div>
        )}
      </div>

      {/* Add Conversation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a new conversation</DialogTitle>
            <DialogDescription>
              Import conversations from your connected WhatsApp account.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-account">Select WhatsApp Account</Label>
              <Select
                value={selectedApiKey}
                onValueChange={setSelectedApiKey}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a WhatsApp account" />
                </SelectTrigger>
                <SelectContent>
                  {apiKeys.length === 0 ? (
                    <SelectItem value="no-keys" disabled>No WhatsApp accounts found</SelectItem>
                  ) : (
                    apiKeys.map(key => (
                      <SelectItem key={key.id} value={key.id}>
                        {key.name || 'Unnamed Account'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Customer Search and Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer-search">Link to Customer <span className="text-red-500">*</span></Label>
              {selectedCustomer ? (
                <div className="flex items-center bg-blue-50 border border-blue-200 rounded-md p-2">
                  <div className="flex-grow">
                    <div className="font-medium text-blue-700">{selectedCustomer.name}</div>
                    {selectedCustomer.email && (
                      <div className="text-sm text-blue-600">{selectedCustomer.email}</div>
                    )}
                  </div>
                  <button 
                    type="button" 
                    onClick={clearSelectedCustomer}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  {/* Replace the Popover with a direct Select component for better reliability */}
                  <div className="mb-2">
                    <Input
                      id="customer-search"
                      placeholder="Search customers..."
                      className="pl-9 mb-2"
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        searchCustomers(e.target.value);
                      }}
                    />
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  </div>
                  
                  <Select
                    value={selectedCustomerId}
                    onValueChange={(value) => {
                      // Find the selected customer by ID
                      const customer = customers.find(c => c.id === value);
                      if (customer) {
                        setSelectedCustomer(customer);
                        setSelectedCustomerId(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {isSearchingCustomers ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          <span className="ml-2 text-sm text-gray-500">Searching...</span>
                        </div>
                      ) : (
                        customers
                          .filter(customer => 
                            !customerSearchTerm || 
                            customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                            (customer.email && customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase()))
                          )
                          .map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} {customer.email ? `(${customer.email})` : ''}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="text-xs text-gray-500">
                Conversations must be linked to a customer for organization and tracking
              </div>
              {!selectedCustomer && customerSearchTerm.length > 0 && (
                <div className="text-xs text-amber-600 mt-1">
                  Please select a customer from the search results
                </div>
              )}
            </div>
            
            <div className="pt-4">
              <Button
                onClick={fetchChats}
                disabled={!selectedApiKey || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading Chats...
                  </>
                ) : (
                  'Fetch Chats'
                )}
              </Button>
            </div>
            
            {error && (
              <div className="text-red-500 text-sm mt-2">{error}</div>
            )}

            {chats.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Select Conversations to Import</h4>
                <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
                  {chats.map(chat => (
                    <div key={chat.chat_id} className="flex items-center p-2 hover:bg-gray-100 rounded-md">
                      <input
                        type="checkbox"
                        id={chat.chat_id}
                        className="mr-2"
                        checked={selectedChats.includes(chat.chat_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedChats([...selectedChats, chat.chat_id]);
                          } else {
                            setSelectedChats(selectedChats.filter(id => id !== chat.chat_id));
                          }
                        }}
                      />
                      <div>
                        <label htmlFor={chat.chat_id} className="font-medium cursor-pointer">
                          {chat.chat_name}
                        </label>
                        <div className="text-sm text-gray-500">
                          {chat.chat_type === 'group' ? 'Group' : 'Individual'} • {chat.member_count} members
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  className="mt-4 w-full sticky bottom-0" 
                  disabled={selectedChats.length === 0 || isImporting}
                  onClick={importSelectedChats}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import Selected (${selectedChats.length})`
                  )}
                </Button>
                
                {importSuccess && (
                  <div className="mt-2 text-green-600 text-sm">
                    Conversations imported successfully!
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ConversationsPage