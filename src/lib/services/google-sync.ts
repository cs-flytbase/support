import { calendar_v3, gmail_v1, google } from '@googleapis/calendar';
import { createClient } from '@supabase/supabase-js';
import { supabaseClient } from '@/utils/supabase/client';

export async function setupGoogleWebhooks(userId: string, accessToken: string, refreshToken: string) {
  try {
    // Initialize Google API client
    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Set up Calendar webhook
    const calendarChannelId = `calendar-${userId}-${Date.now()}`;
    const calendarWebhook = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: calendarChannelId,
        type: 'web_hook',
        address: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/google-webhook`,
        expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(), // 7 days
      },
    });

    // Store webhook details in Supabase
    const { error: webhookError } = await supabaseClient
      .from('google_webhook_notifications')
      .upsert({
        channel_id: calendarChannelId,
        resource_id: calendarWebhook.data.resourceId,
        expiration: new Date(parseInt(calendarWebhook.data.expiration)).toISOString(),
        user_id: userId,
      });

    if (webhookError) {
      console.error('Error storing webhook details:', webhookError);
      throw webhookError;
    }

    // Set up Gmail webhook
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const gmailChannelId = `gmail-${userId}-${Date.now()}`;
    const gmailWebhook = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        topicName: `projects/${process.env.GOOGLE_PROJECT_ID}/topics/gmail-notifications`,
      },
    });

    // Store Gmail webhook details
    const { error: gmailWebhookError } = await supabaseClient
      .from('google_webhook_notifications')
      .upsert({
        channel_id: gmailChannelId,
        resource_id: gmailWebhook.data.historyId,
        user_id: userId,
      });

    if (gmailWebhookError) {
      console.error('Error storing Gmail webhook details:', gmailWebhookError);
      throw gmailWebhookError;
    }

    return {
      calendarWebhook: calendarWebhook.data,
      gmailWebhook: gmailWebhook.data,
    };

  } catch (error) {
    console.error('Error setting up Google webhooks:', error);
    throw error;
  }
}

// Function to refresh webhooks before they expire
export async function refreshWebhooks(userId: string) {
  try {
    // Get user's Google tokens
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokensError || !tokens) {
      throw new Error('Google tokens not found');
    }

    // Set up new webhooks
    return await setupGoogleWebhooks(userId, tokens.access_token, tokens.refresh_token);

  } catch (error) {
    console.error('Error refreshing webhooks:', error);
    throw error;
  }
} 