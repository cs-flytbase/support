// lib/supabase/sync-helpers.ts
import { createClient } from '@supabase/supabase-js'

// Use regular supabase-js client for server-side operations with service role
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  }
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Please add it to your .env file.')
  }
  
  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export const syncHelpers = {
  // Get user by Clerk ID (now just a lookup - creation handled by auth.ts)
  async getUserByClerkId(clerkUserId: string) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkUserId)
      .single()
    
    if (error) {
      throw error
    }
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
      .select('id, clerk_id, email')
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
      .from('emails')
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

  // Batch insert meetings 
  async batchInsertMeetings(meetings: any[]) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('meetings')
      .insert(meetings)
      .select()
    
    if (error) throw error
    return data
  },

  // Convert calendar events to meetings
  async convertCalendarEventsToMeetings(userId: string, eventIds?: string[]) {
    const supabase = createAdminClient()
    
    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
    
    if (eventIds && eventIds.length > 0) {
      query = query.in('id', eventIds)
    } else {
      // Only get events that look like meetings (have attendees or certain keywords)
      query = query.or('attendees.neq.[],summary.ilike.%meeting%,summary.ilike.%call%,summary.ilike.%interview%')
    }
    
    const { data: events, error } = await query
    
    if (error) throw error
    if (!events || events.length === 0) return []

    const meetings = events.map(event => ({
      user_id: event.user_id,
      customer_id: event.customer_id,
      calendar_event_id: event.id,
      title: event.summary || 'Untitled Meeting',
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      meeting_type: this.determineMeetingType(event.summary, event.description),
      status: event.status || 'scheduled',
      attendees: event.attendees || '[]',
      organizer_email: event.organizer_email,
      organizer_name: event.organizer_name,
      google_meet_link: this.extractMeetLink(event.conference_data, 'googlemeet'),
      zoom_link: this.extractMeetLink(event.conference_data, 'zoom'),
      meeting_platform: this.determineMeetingPlatform(event.conference_data),
      external_meeting_id: event.google_event_id,
      is_recurring: event.is_recurring || false,
      recurring_pattern: event.recurrence_rule,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    return await this.batchInsertMeetings(meetings)
  },

  // Helper function to determine meeting type
  determineMeetingType(summary?: string, description?: string) {
    const text = `${summary || ''} ${description || ''}`.toLowerCase()
    
    if (text.includes('interview') || text.includes('candidate')) return 'interview'
    if (text.includes('demo') || text.includes('presentation')) return 'demo'
    if (text.includes('sales') || text.includes('discovery')) return 'sales'
    if (text.includes('support') || text.includes('help')) return 'support'
    if (text.includes('standup') || text.includes('daily')) return 'standup'
    if (text.includes('review') || text.includes('retrospective')) return 'review'
    if (text.includes('planning') || text.includes('sprint')) return 'planning'
    
    return 'general'
  },

  // Helper function to extract meeting links
  extractMeetLink(conferenceData?: string, platform?: string) {
    if (!conferenceData) return null
    
    try {
      const data = typeof conferenceData === 'string' ? JSON.parse(conferenceData) : conferenceData
      
      if (platform === 'googlemeet' && data.hangoutLink) {
        return data.hangoutLink
      }
      
      if (platform === 'zoom' && data.entryPoints) {
        const zoomEntry = data.entryPoints.find((entry: any) => 
          entry.uri && entry.uri.includes('zoom')
        )
        return zoomEntry?.uri || null
      }
      
      // Generic link extraction
      if (data.entryPoints && data.entryPoints.length > 0) {
        return data.entryPoints[0].uri
      }
      
    } catch (error) {
      console.error('Error parsing conference data:', error)
    }
    
    return null
  },

  // Helper function to determine meeting platform
  determineMeetingPlatform(conferenceData?: string) {
    if (!conferenceData) return null
    
    try {
      const data = typeof conferenceData === 'string' ? JSON.parse(conferenceData) : conferenceData
      
      if (data.hangoutLink) return 'google_meet'
      if (data.entryPoints) {
        const entry = data.entryPoints[0]
        if (entry?.uri?.includes('zoom')) return 'zoom'
        if (entry?.uri?.includes('teams')) return 'microsoft_teams'
        if (entry?.uri?.includes('webex')) return 'webex'
      }
      
    } catch (error) {
      console.error('Error determining platform:', error)
    }
    
    return 'other'
  },

  // Get meetings for user
  async getUserMeetings(userId: string, limit: number = 50) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  },

  // Check if email exists
  async emailExists(googleMessageId: string) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('emails')
      .select('id')
      .or(`message_id.eq.${googleMessageId},google_message_id.eq.${googleMessageId}`)
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
      .from('emails')
      .update({ 
        labels: ['DELETED'], // Store as array, not JSON string
        is_trash: true,
        updated_at: new Date().toISOString()
      })
      .or(`message_id.eq.${googleMessageId},google_message_id.eq.${googleMessageId}`)
    
    if (error) throw error
  },

  // Upsert email
  async upsertEmail(emailData: any) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('emails')
      .upsert(emailData, {
        onConflict: 'google_message_id',
        ignoreDuplicates: false
      })
      .select()
    
    if (error) throw error
    return data
  }
}