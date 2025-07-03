// lib/supabase/sync-helpers.ts
import { createClient } from '@supabase/supabase-js'

// Use regular supabase-js client for server-side operations with service role
const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export const syncHelpers = {
  // Get user by Clerk ID
  async getUserByClerkId(clerkUserId: string) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single()
    
    if (error) throw error
    return data
  },

  // Get user integrations
  async getUserIntegrations(userId: string, platform?: string) {
    const supabase = createAdminClient()
    let query = supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (platform) {
      query = query.eq('platform', platform)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Get all users with active integrations
  async getUsersWithActiveIntegrations() {
    const supabase = createAdminClient()
    
    // First get user IDs with active integrations
    const { data: integrationData, error: intError } = await supabase
      .from('user_integrations')
      .select('user_id')
      .eq('is_active', true)
    
    if (intError) throw intError
    if (!integrationData || integrationData.length === 0) return []
    
    // Get unique user IDs
    const userIds = [...new Set(integrationData.map(i => i.user_id))]
    
    // Get users with those IDs
    const { data, error } = await supabase
      .from('users')
      .select('id, clerk_user_id, email')
      .in('id', userIds)
    
    if (error) throw error
    return data
  },

  // Update integration sync status
  async updateIntegrationSync(userId: string, platform: string, metadata: any) {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('user_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        metadata: metadata,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('platform', platform)
    
    if (error) throw error
  },

  // Batch insert emails
  async batchInsertEmails(emails: any[]) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('email')
      .insert(emails)
      .select()
    
    if (error) throw error
    return data
  },

  // Batch insert calendar events
  async batchInsertCalendarEvents(events: any[]) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(events)
      .select()
    
    if (error) throw error
    return data
  },

  // Check if email exists
  async emailExists(googleMessageId: string) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('email')
      .select('id')
      .eq('google_message_id', googleMessageId)
      .single()
    
    return !!data
  },

  // Check if calendar event exists
  async calendarEventExists(googleEventId: string) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('google_event_id', googleEventId)
      .single()
    
    return !!data
  },

  // Find customer by email domain
  async findCustomerByEmailDomain(email: string) {
    const domain = email.split('@')[1]
    if (!domain) return null
    
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('customers')
      .select('id')
      .ilike('website', `%${domain}%`)
      .limit(1)
      .single()
    
    return data?.id || null
  },

  // Find customer by contact email
  async findCustomerByContactEmail(email: string) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('customer_contacts')
      .select('customer_id')
      .eq('email', email)
      .limit(1)
      .single()
    
    return data?.customer_id || null
  },

  // Update calendar event
  async updateCalendarEvent(eventData: any) {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('calendar_events')
      .update({
        ...eventData,
        updated_at: new Date().toISOString()
      })
      .eq('google_event_id', eventData.google_event_id)
    
    if (error) throw error
  },

  // Mark calendar event as deleted
  async markCalendarEventDeleted(googleEventId: string) {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('calendar_events')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('google_event_id', googleEventId)
    
    if (error) throw error
  },

  // Delete calendar events
  async deleteCalendarEvents(googleEventIds: string[]) {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .in('google_event_id', googleEventIds)
    
    if (error) throw error
  },

  // Mark email as deleted
  async markEmailDeleted(googleMessageId: string) {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('email')
      .update({ 
        labels: JSON.stringify(['DELETED']),
        updated_at: new Date().toISOString()
      })
      .eq('google_message_id', googleMessageId)
    
    if (error) throw error
  }
}