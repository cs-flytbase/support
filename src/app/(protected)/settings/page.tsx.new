'use client'

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

const SettingsPage = () => {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const [platformType, setPlatformType] = useState('whatsapp');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiName, setApiName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  // AI Agent state
  const [agents, setAgents] = useState<any[]>([]);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentWebhook, setNewAgentWebhook] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [isProcessingAgent, setIsProcessingAgent] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);

  // Store the Supabase user ID
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  // Load AI agents
  const loadAgents = async () => {
    if (!supabaseUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('user_id', supabaseUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading AI agents:', error);
    }
  };
  
  // Create or update an AI agent
  const saveAgent = async (isEdit = false) => {
    if (!supabaseUserId) {
      setMessage({ type: 'error', text: 'User not found' });
      return;
    }
    
    // Validate inputs
    if (!newAgentName.trim()) {
      setMessage({ type: 'error', text: 'Agent name is required' });
      return;
    }
    
    if (!newAgentWebhook.trim()) {
      setMessage({ type: 'error', text: 'Webhook URL is required' });
      return;
    }
    
    setIsProcessingAgent(true);
    setMessage({ type: '', text: '' });
    
    try {
      if (isEdit && editingAgent) {
        // Update existing agent
        const { error } = await supabase
          .from('ai_agents')
          .update({
            name: newAgentName,
            webhook_url: newAgentWebhook,
            description: newAgentDescription,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAgent.id);
          
        if (error) throw error;
        setMessage({ type: 'success', text: 'AI agent updated successfully' });
      } else {
        // Create new agent
        const { error } = await supabase
          .from('ai_agents')
          .insert({
            user_id: supabaseUserId,
            name: newAgentName,
            webhook_url: newAgentWebhook,
            description: newAgentDescription,
            is_active: true
          });
          
        if (error) throw error;
        setMessage({ type: 'success', text: 'AI agent created successfully' });
      }
      
      // Reset form and reload agents
      setNewAgentName('');
      setNewAgentWebhook('');
      setNewAgentDescription('');
      setEditingAgent(null);
      setShowAgentDialog(false);
      loadAgents();
    } catch (error: any) {
      console.error('Error saving AI agent:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to save AI agent: ${error.message || 'Unknown error'}` 
      });
    } finally {
      setIsProcessingAgent(false);
    }
  };
  
  // Delete an AI agent
  const deleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this AI agent?')) return;
    
    setIsProcessingAgent(true);
    
    try {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', agentId);
        
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'AI agent deleted successfully' });
      loadAgents();
    } catch (error: any) {
      console.error('Error deleting AI agent:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to delete AI agent: ${error.message || 'Unknown error'}` 
      });
    } finally {
      setIsProcessingAgent(false);
    }
  };
  
  // Edit an agent
  const startEditAgent = (agent: any) => {
    setEditingAgent(agent);
    setNewAgentName(agent.name);
    setNewAgentWebhook(agent.webhook_url);
    setNewAgentDescription(agent.description || '');
    setShowAgentDialog(true);
  };
  
  // Reset agent form
  const resetAgentForm = () => {
    setEditingAgent(null);
    setNewAgentName('');
    setNewAgentWebhook('');
    setNewAgentDescription('');
  };

  useEffect(() => {
    const syncUserWithSupabase = async () => {
      if (isLoaded && isSignedIn && clerkUser) {
        try {
          // Check if user exists
          const { data: existingUser, error: queryError } = await supabase
            .from('users')
            .select('*')
            .eq('clerk_id', clerkUser.id)
            .single();

          if (queryError && queryError.code !== 'PGRST116') { // PGRST116 is not found error
            throw queryError;
          }

          // If user doesn't exist, create them
          if (!existingUser) {
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                email: clerkUser.primaryEmailAddress?.emailAddress || '',
                full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
                avatar_url: clerkUser.imageUrl,
                clerk_id: clerkUser.id
              })
              .select();

            if (insertError) {
              throw insertError;
            }
            
            // Set the Supabase user ID from the newly created user
            if (newUser && newUser.length > 0) {
              setSupabaseUserId(newUser[0].id);
              // Load existing API keys and AI agents after we have the user ID
              loadApiKey(platformType);
              loadAgents();
            }
          } else {
            // Set the Supabase user ID from the existing user
            setSupabaseUserId(existingUser.id);
            // Load existing API keys and AI agents after we have the user ID
            loadApiKey(platformType);
            loadAgents();
          }
        } catch (error) {
          console.error('Error syncing user with Supabase:', error);
        }
      }
    };

    syncUserWithSupabase();
  }, [isLoaded, isSignedIn, clerkUser]);

  // Load API key for selected platform
  const loadApiKey = async (platform: string) => {
    if (!supabaseUserId) {
      console.log('Cannot load API keys - no Supabase user ID available');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', supabaseUserId)
        .eq('platform', platform)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is not found error
        throw error;
      }

      if (data) {
        setApiKey(data.api_key || '');
        setApiSecret(data.api_secret || '');
        setApiName(data.name || '');
        setPhoneNumber(data.metadata?.phone_number || '');
      } else {
        setApiKey('');
        setApiSecret('');
        setApiName('');
        setPhoneNumber('');
      }
    } catch (error) {
      console.error(`Error loading ${platform} API key:`, error);
    }
  };

  const handlePlatformChange = (platform: string) => {
    setPlatformType(platform);
    loadApiKey(platform);
  };

  const saveApiKey = async () => {
    if (!isSignedIn || !clerkUser) {
      setMessage({ type: 'error', text: 'You must be logged in to save settings' });
      return;
    }

    if (!supabaseUserId) {
      setMessage({ type: 'error', text: 'Supabase user account not found' });
      return;
    }

    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'API key is required' });
      return;
    }

    if (!apiName.trim()) {
      setMessage({ type: 'error', text: 'Account name is required' });
      return;
    }

    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Check if user already has an API key for the selected platform
      const { data: existingKey, error: queryError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', supabaseUserId)
        .eq('platform', platformType)
        .single();

      // Prepare the metadata object based on platform type
      const metadata = platformType === 'whatsapp' 
        ? JSON.stringify({ phone_number: phoneNumber }) 
        : null;

      // Insert or update the API key
      if (existingKey) {
        // Update existing API key
        const { error } = await supabase
          .from('api_keys')
          .update({
            api_key: apiKey,
            api_secret: apiSecret || null,
            name: apiName,
            metadata: metadata
          })
          .eq('id', existingKey.id);

        if (error) {
          console.error('Update error details:', error);
          throw error;
        }
      } else if (queryError && queryError.code === 'PGRST116') {
        // PGRST116 is not found error - insert new record
        const { error } = await supabase
          .from('api_keys')
          .insert({
            user_id: supabaseUserId,
            platform: platformType,
            api_key: apiKey,
            api_secret: apiSecret || null,
            name: apiName,
            metadata: metadata
          });

        if (error) {
          console.error('Insert error details:', error);
          throw error;
        }
      } else if (queryError) {
        // Some other error occurred during the query
        throw queryError;
      }

      setMessage({ 
        type: 'success', 
        text: `${platformType.charAt(0).toUpperCase() + platformType.slice(1)} API key saved successfully!` 
      });
    } catch (error: any) {
      console.error('Error saving API key:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to save API key. ${error?.message || 'Please try again.'}` 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>;
  }

  if (!isSignedIn) {
    return <div className="p-8">Please sign in to access settings</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="apiIntegration" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="apiIntegration">API Integration</TabsTrigger>
          <TabsTrigger value="aiAgents">AI Agents</TabsTrigger>
        </TabsList>
        
        {/* API Integration Tab */}
        <TabsContent value="apiIntegration">
          <Card>
            <CardHeader>
              <CardTitle>API Integration</CardTitle>
              <CardDescription>
                Configure your API keys for different platforms to enable integration.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="whatsapp" className="w-full" onValueChange={handlePlatformChange}>
                <TabsList className="mb-4">
                  <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                  <TabsTrigger value="telegram">Telegram</TabsTrigger>
                  <TabsTrigger value="slack">Slack</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                </TabsList>
                
                <TabsContent value="whatsapp" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-phone-number">WhatsApp Phone Number</Label>
                    <Input 
                      id="whatsapp-phone-number" 
                      type="tel" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)} 
                      placeholder="Enter WhatsApp phone number with country code (e.g., +1234567890)" 
                    />
                  </div>
                  
                  <div className="form-group mb-4">
                    <label htmlFor="apiName" className="block text-sm font-medium text-gray-700 mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      id="apiName"
                      value={apiName}
                      onChange={(e) => setApiName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter a name for this account"
                    />
                  </div>
                  <div className="form-group mb-4">
                    <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                      API Key
                    </label>
                    <input
                      type="text"
                      id="apiKey"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter your API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-api-secret">API Secret (Optional)</Label>
                    <Input 
                      id="whatsapp-api-secret" 
                      type="password" 
                      value={apiSecret} 
                      onChange={(e) => setApiSecret(e.target.value)} 
                      placeholder="Enter API secret if required" 
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="telegram" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="telegram-api-key">Telegram Bot Token</Label>
                    <Input 
                      id="telegram-api-key" 
                      type="text" 
                      value={apiKey} 
                      onChange={(e) => setApiKey(e.target.value)} 
                      placeholder="Enter Telegram Bot Token" 
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="slack" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="slack-api-key">Slack API Key</Label>
                    <Input 
                      id="slack-api-key" 
                      type="text" 
                      value={apiKey} 
                      onChange={(e) => setApiKey(e.target.value)} 
                      placeholder="Enter Slack API Key" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="slack-api-secret">API Secret</Label>
                    <Input 
                      id="slack-api-secret" 
                      type="password" 
                      value={apiSecret} 
                      onChange={(e) => setApiSecret(e.target.value)} 
                      placeholder="Enter Slack API Secret" 
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="email" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-api-key">Email Service API Key</Label>
                    <Input 
                      id="email-api-key" 
                      type="text" 
                      value={apiKey} 
                      onChange={(e) => setApiKey(e.target.value)} 
                      placeholder="Enter Email Service API Key" 
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button onClick={saveApiKey} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save API Key'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* AI Agents Tab */}
        <TabsContent value="aiAgents">
          <Card>
            <CardHeader>
              <CardTitle>AI Agents</CardTitle>
              <CardDescription>
                Create and manage AI agents that can be connected to your conversations.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="flex justify-end mb-4">
                <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => resetAgentForm()}
                      className="flex items-center gap-1"
                    >
                      <Plus size={16} /> Add Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingAgent ? 'Edit AI Agent' : 'Add New AI Agent'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="agent-name">Agent Name</Label>
                        <Input
                          id="agent-name"
                          value={newAgentName}
                          onChange={(e) => setNewAgentName(e.target.value)}
                          placeholder="Enter agent name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="webhook-url">Webhook URL</Label>
                        <Input
                          id="webhook-url"
                          value={newAgentWebhook}
                          onChange={(e) => setNewAgentWebhook(e.target.value)}
                          placeholder="https://your-webhook-endpoint.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="agent-description">Description (Optional)</Label>
                        <Textarea
                          id="agent-description"
                          value={newAgentDescription}
                          onChange={(e) => setNewAgentDescription(e.target.value)}
                          placeholder="Describe what this agent does"
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowAgentDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => saveAgent(!!editingAgent)}
                        disabled={isProcessingAgent}
                      >
                        {isProcessingAgent
                          ? 'Saving...'
                          : editingAgent
                          ? 'Update Agent'
                          : 'Create Agent'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {agents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No AI agents added yet. Add your first agent to connect to conversations.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {agents.map((agent) => (
                    <Card key={agent.id}>
                      <CardHeader className="py-4">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditAgent(agent)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAgent(agent.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-2">
                        <p className="text-sm text-gray-600 mb-2">
                          {agent.description || 'No description provided'}
                        </p>
                        <p className="text-xs text-gray-500 font-mono break-all">
                          {agent.webhook_url}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {message.text && (
        <Alert className={`mt-4 ${message.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <AlertTitle>{message.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default SettingsPage;
