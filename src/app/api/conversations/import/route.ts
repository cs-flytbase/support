import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/utils/supabase/server';

interface ChatToImport {
  chat_id: string;
  chat_name: string;
  chat_type: string;
  last_message_timestamp?: string;
  members?: Record<string, any>;
}

interface ImportResult {
  chat_id: string;
  conversation_id?: string;
  success: boolean;
  error?: string;
}

// Webhook function to notify n8n about new conversations
async function notifyN8nWebhook(conversationId: string) {
  try {
    const webhookUrl = 'https://flytbasecs69.app.n8n.cloud/webhook/e62b5ad5-566c-482b-9baf-74e157cbaa29';
    console.log(`Sending webhook notification to n8n for conversation ID: ${conversationId}`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
        event: 'new_conversation'
      })
    });
    
    if (response.ok) {
      console.log('Webhook notification sent successfully');
      return true;
    } else {
      console.error(`Webhook notification failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('Error sending webhook notification:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate the user - properly await the auth() Promise
    const authResult = await auth();
    const userId = authResult.userId;
    
    if (!userId) {
      console.log('Authentication failed: No user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('Authentication successful for user:', userId);

    // Initialize Supabase client
    const supabase = createClient();
    
    // Parse the request body
    const body = await req.json();
    const { apiKeyId, selectedChats, customerId } = body;
    
    // Validate request data
    if (!apiKeyId || !selectedChats || !Array.isArray(selectedChats) || selectedChats.length === 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    
    // Validate customerId - now required
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }
    
    console.log(`Starting import of ${selectedChats.length} conversations`);

    // Get the user's Supabase ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !userData) {
      console.error('User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the API key details
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', apiKeyId)
      .eq('user_id', userData.id)
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('API key not found:', apiKeyError);
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const importResults: ImportResult[] = [];
    
    // Process each selected chat
    for (const currentChat of selectedChats as ChatToImport[]) {
      try {
        console.log(`Processing chat: ${currentChat.chat_name}`);
        let isNewConversation = false;
        let conversationId = '';
        
        // Check if conversation already exists
        const { data: existingConversation, error: checkError } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', userData.id)
          .eq('platform_type', apiKeyData.platform)
          .eq('chat_id', currentChat.chat_id)
          .maybeSingle();
          
        if (checkError) {
          console.error(`Error checking for existing conversation: ${currentChat.chat_name}`, checkError);
          importResults.push({ 
            chat_id: currentChat.chat_id, 
            success: false, 
            error: checkError.message 
          });
          continue;
        }
        
        if (existingConversation) {
          // Update existing conversation
          console.log(`Updating existing conversation: ${existingConversation.id}`);
          const { data: updateResult, error: updateError } = await supabase
            .from('conversations')
            .update({
              title: currentChat.chat_name,
              updated_at: new Date().toISOString(),
              customer_id: customerId
            })
            .eq('id', existingConversation.id)
            .select()
            .single();
            
          if (updateError) {
            console.error(`Error updating conversation: ${currentChat.chat_name}`, updateError);
            importResults.push({ 
              chat_id: currentChat.chat_id, 
              success: false, 
              error: updateError.message 
            });
            continue;
          }
          
          conversationId = existingConversation.id;
          isNewConversation = false;
        } else {
          // Insert new conversation
          isNewConversation = true;
          console.log(`Creating new conversation: ${currentChat.chat_name}`);
          
          const { data: insertResult, error: insertError } = await supabase
            .from('conversations')
            .upsert({
              user_id: userData.id,
              chat_id: currentChat.chat_id,
              platform_type: apiKeyData.platform,
              title: currentChat.chat_name,
              is_group: currentChat.chat_type === 'group',
              participants: currentChat.members || null,
              customer_id: customerId,
              api: apiKeyData.id,
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,platform_type,chat_id',
              ignoreDuplicates: false // Update existing records
            })
            .select()
            .single();
            
          if (insertError) {
            console.error(`Error creating conversation: ${currentChat.chat_name}`, insertError);
            importResults.push({ 
              chat_id: currentChat.chat_id, 
              success: false, 
              error: insertError.message 
            });
            continue;
          }
          
          if (!insertResult) {
            console.error(`No result returned when creating conversation: ${currentChat.chat_name}`);
            importResults.push({ 
              chat_id: currentChat.chat_id, 
              success: false, 
              error: 'Failed to create conversation - no result returned' 
            });
            continue;
          }
          
          conversationId = insertResult.id;
          console.log(`Created new conversation with ID: ${conversationId}`);
          
          // Send webhook notification for new conversation
          if (isNewConversation) {
            const webhookSuccess = await notifyN8nWebhook(conversationId);
            console.log(`Webhook notification ${webhookSuccess ? 'succeeded' : 'failed'}`);
          }
        }
        
        // Add conversation members
        if (conversationId && currentChat.members) {
          try {
            console.log('Processing conversation members');
            // Extract members data from chat object
            const membersData = currentChat.members || {};
            const memberRecords = [];
            
            // Convert object format to array of member records
            for (const [memberId, memberData] of Object.entries(membersData)) {
              if (typeof memberData === 'object' && memberData !== null) {
                const member = memberData as Record<string, any>; // Type assertion
                memberRecords.push({
                  conversation_id: conversationId,
                  external_id: memberId,
                  name: member.contact_name || 'Unknown',
                  is_admin: member.is_admin || false,
                  avatar_url: member.contact_image || null,
                  created_at: new Date().toISOString()
                });
              }
            }
            
            // Upsert members to avoid duplicates
            if (memberRecords.length > 0) {
              const { data: memberInserts, error: memberError } = await supabase
                .from('conversation_members')
                .upsert(memberRecords, {
                  onConflict: 'conversation_id,external_id',
                  ignoreDuplicates: false
                });
                
              if (memberError) {
                console.error('Error adding members:', memberError);
              } else {
                console.log(`Added ${memberRecords.length} members to conversation`);
              }
            }
          } catch (memberError) {
            console.error('Error processing members:', memberError);
          }
        }
        
        // Add to successful results
        importResults.push({
          chat_id: currentChat.chat_id,
          conversation_id: conversationId,
          success: true
        });
        
      } catch (error) {
        console.error(`Error importing chat ${currentChat.chat_name}:`, error);
        importResults.push({ 
          chat_id: currentChat.chat_id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    // Return the results
    return NextResponse.json({ 
      success: true, 
      imported: importResults.length,
      results: importResults,
      message: `Successfully imported ${importResults.filter(r => r.success).length} of ${selectedChats.length} conversations`
    });
    
  } catch (error) {
    console.error('Error in conversation import:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}