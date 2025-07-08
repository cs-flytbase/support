import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { google } from "https://deno.land/x/google_deno_integration@v1.0.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the headers from the request
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceId = req.headers.get('x-goog-resource-id');
    const resourceState = req.headers.get('x-goog-resource-state');
    const messageNumber = req.headers.get('x-goog-message-number');

    console.log('Received webhook:', {
      channelId,
      resourceId,
      resourceState,
      messageNumber
    });

    // Get the notification details from our database
    const { data: notification, error: notificationError } = await supabaseClient
      .from('google_webhook_notifications')
      .select('*')
      .eq('channel_id', channelId)
      .single();

    if (notificationError || !notification) {
      console.error('Error getting notification:', notificationError);
      return new Response(
        JSON.stringify({ error: 'Notification not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Google API client
    const oauth2Client = new google.auth.OAuth2(
      Deno.env.get('GOOGLE_CLIENT_ID'),
      Deno.env.get('GOOGLE_CLIENT_SECRET'),
      Deno.env.get('GOOGLE_REDIRECT_URI')
    );

    // Get the user's tokens
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', notification.user_id)
      .single();

    if (tokensError || !tokens) {
      console.error('Error getting tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Tokens not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set credentials
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    // Handle different resource states
    switch (resourceState) {
      case 'exists':
      case 'update': {
        // Get the updated calendar events
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const events = await calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          maxResults: 10,
          singleEvents: true,
          orderBy: 'startTime',
        });

        // Update events in Supabase
        for (const event of events.data.items || []) {
          const { error: upsertError } = await supabaseClient
            .from('calendar_events')
            .upsert({
              google_event_id: event.id,
              user_id: notification.user_id,
              summary: event.summary,
              description: event.description,
              start_time: event.start?.dateTime || event.start?.date,
              end_time: event.end?.dateTime || event.end?.date,
              location: event.location,
              attendees: event.attendees?.map(a => a.email).join(','),
              organizer_name: event.organizer?.displayName,
              organizer_email: event.organizer?.email,
              updated_at: new Date().toISOString(),
            });

          if (upsertError) {
            console.error('Error upserting event:', upsertError);
          }
        }

        // Get new emails if Gmail notifications are enabled
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const messages = await gmail.users.messages.list({
          userId: 'me',
          q: 'newer_than:1h', // Get emails from the last hour
        });

        // Update emails in Supabase
        for (const message of messages.data.messages || []) {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
          });

          const headers = fullMessage.data.payload?.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value;
          const from = headers.find(h => h.name === 'From')?.value;
          const [senderName, senderEmail] = parseEmailSender(from || '');

          const { error: emailError } = await supabaseClient
            .from('emails')
            .upsert({
              message_id: message.id,
              user_id: notification.user_id,
              subject: subject,
              sender_name: senderName,
              sender_email: senderEmail,
              received_at: new Date(parseInt(message.internalDate!)).toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (emailError) {
            console.error('Error upserting email:', emailError);
          }
        }
        break;
      }

      case 'sync':
        // Handle initial sync
        console.log('Initial sync requested');
        break;

      default:
        console.log('Unhandled resource state:', resourceState);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to parse email sender
function parseEmailSender(from: string): [string | null, string] {
  const match = from.match(/^(?:"?([^"]*)"?\s)?(?:<)?([^>]*)(?:>)?$/);
  if (!match) return [null, from];
  return [match[1] || null, match[2]];
} 