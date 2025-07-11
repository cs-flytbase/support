// lib/services/calendar-sync.ts
import { calendar_v3 } from '@googleapis/calendar'
import { OAuth2Client } from 'google-auth-library'
import { GoogleAuthHelper } from './google-auth'
import { syncHelpers } from './sync-helpers'
import { embeddingService } from './embedding-service'
import { supabaseClient } from '@/utils/supabase/client'

export async function createCalendarEvent(userId: string, eventData: {
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
}) {
  try {
    const calendar = await GoogleAuthHelper.createCalendarClient(userId);

    // Create event in Google Calendar
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: eventData.summary,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime,
        },
        end: {
          dateTime: eventData.endTime,
        },
        location: eventData.location,
        attendees: eventData.attendees?.map(email => ({ email })),
      },
    });

    // Store event in Supabase
    const { error: eventError } = await supabaseClient
      .from('calendar_events')
      .upsert({
        google_event_id: event.data.id,
        user_id: userId,
        summary: eventData.summary,
        description: eventData.description,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        location: eventData.location,
        attendees: eventData.attendees?.join(','),
        created_at: new Date().toISOString(),
      });

    if (eventError) {
      console.error('Error storing event:', eventError);
      throw eventError;
    }

    return event.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

export async function updateCalendarEvent(userId: string, eventId: string, eventData: {
  summary?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  attendees?: string[];
}) {
  try {
    const calendar = await GoogleAuthHelper.createCalendarClient(userId);

    // Update event in Google Calendar
    const event = await calendar.events.patch({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: {
        summary: eventData.summary,
        description: eventData.description,
        start: eventData.startTime ? {
          dateTime: eventData.startTime,
        } : undefined,
        end: eventData.endTime ? {
          dateTime: eventData.endTime,
        } : undefined,
        location: eventData.location,
        attendees: eventData.attendees?.map(email => ({ email })),
      },
    });

    // Update event in Supabase
    const { error: eventError } = await supabaseClient
      .from('calendar_events')
      .upsert({
        google_event_id: event.data.id,
        user_id: userId,
        summary: eventData.summary,
        description: eventData.description,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        location: eventData.location,
        attendees: eventData.attendees?.join(','),
        updated_at: new Date().toISOString(),
      });

    if (eventError) {
      console.error('Error updating event:', eventError);
      throw eventError;
    }

    return event.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

export class CalendarSyncService {
  private userId: string;
  private dbUserId: string;

  constructor(userId: string, dbUserId: string) {
    this.userId = userId;
    this.dbUserId = dbUserId;
  }

  // Full sync - get ALL events from the past year
  async performFullSync(daysBack: number = 365) {
    console.log(`Starting full Calendar sync for user ${this.userId} - last ${daysBack} days`)
    
    try {
      const calendar = await GoogleAuthHelper.createCalendarClient(this.userId)
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const timeMin = new Date()
      timeMin.setDate(now.getDate() - daysBack)
      
      // Get all calendars first
      const calendarListResponse = await GoogleAuthHelper.withRetry(async () => {
        return await calendar.calendarList.list({
          maxResults: 250
        })
      })
      
      const calendars = calendarListResponse.data.items || []
      console.log(`Found ${calendars.length} calendars to sync`)
      
      let totalEventsProcessed = 0
      
      // First sync recent and future events
      console.log('First syncing recent and future events...')
      for (const cal of calendars) {
        if (!cal.id) continue
        
        console.log(`Syncing recent events for calendar: ${cal.summary || cal.id}`)
        try {
          const eventsProcessed = await this.syncCalendarEvents(
            calendar, 
            cal.id, 
            cal.summary || 'Unknown Calendar',
            startOfToday,
            null,
            true,
            undefined // No end time for future events
          )
          totalEventsProcessed += eventsProcessed
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.error(`Error syncing recent events for calendar ${cal.id}:`, error)
        }
      }
      
      // Then sync older events
      console.log('Now syncing older events...')
      for (const cal of calendars) {
        if (!cal.id) continue
        
        console.log(`Syncing older events for calendar: ${cal.summary || cal.id}`)
        try {
          const eventsProcessed = await this.syncCalendarEvents(
            calendar, 
            cal.id, 
            cal.summary || 'Unknown Calendar',
            timeMin,
            null,
            true,
            startOfToday // End time for older events
          )
          totalEventsProcessed += eventsProcessed
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.error(`Error syncing older events for calendar ${cal.id}:`, error)
        }
      }
      
      // Update sync metadata
      await this.updateSyncMetadata('full', { 
        last_sync_type: 'full',
        events_synced: totalEventsProcessed,
        calendars_synced: calendars.length,
        sync_completed_at: new Date().toISOString()
      })
      
      console.log(`Full Calendar sync completed: ${totalEventsProcessed} events from ${calendars.length} calendars`)
      return { success: true, eventsSynced: totalEventsProcessed, calendarsSynced: calendars.length }
      
    } catch (error) {
      console.error('Calendar full sync failed:', error)
      throw error
    }
  }

  // Incremental sync using sync tokens
  async performIncrementalSync() {
    console.log(`Starting incremental Calendar sync for user ${this.userId}`)
    
    try {
      const integration = await syncHelpers.getUserIntegrations(this.dbUserId, 'google_calendar')
      if (!integration || integration.length === 0) {
        console.log('No Calendar integration found, performing full sync')
        return await this.performFullSync()
      }
      
      const metadata = integration[0].metadata || {}
      const calendarSyncTokens = metadata.calendarSyncTokens || {}
      
      if (Object.keys(calendarSyncTokens).length === 0) {
        console.log('No sync tokens found, performing full sync')
        return await this.performFullSync()
      }
      
      const calendar = await GoogleAuthHelper.createCalendarClient(this.userId)
      let totalEventsProcessed = 0
      const updatedSyncTokens: { [key: string]: string } = {}
      
      // Sync each calendar using its sync token
      for (const [calendarId, syncToken] of Object.entries(calendarSyncTokens)) {
        if (typeof syncToken !== 'string') continue
        
        console.log(`Incremental sync for calendar: ${calendarId}`)
        
        try {
          const result = await this.syncCalendarEventsIncremental(
            calendar,
            calendarId,
            syncToken
          )
          
          totalEventsProcessed += result.eventsProcessed
          updatedSyncTokens[calendarId] = result.newSyncToken
          
          // Small delay between calendars
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (error: any) {
          console.error(`Error in incremental sync for calendar ${calendarId}:`, error)
          
          // If sync token is invalid (410 error), fall back to full sync for this calendar
          if (error.code === 410 || error.status === 410) {
            console.log(`Sync token invalid for calendar ${calendarId}, performing full sync`)
            const eventsProcessed = await this.syncCalendarEvents(
              calendar,
              calendarId,
              'Unknown Calendar',
              new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year back
              null,
              true
            )
            totalEventsProcessed += eventsProcessed
          }
        }
      }
      
      // Update sync metadata with new sync tokens
      await this.updateSyncMetadata('incremental', {
        last_sync_type: 'incremental',
        events_processed: totalEventsProcessed,
        calendarSyncTokens: { ...calendarSyncTokens, ...updatedSyncTokens },
        sync_completed_at: new Date().toISOString()
      })
      
      console.log(`Incremental Calendar sync completed: ${totalEventsProcessed} events processed`)
      return { success: true, eventsProcessed: totalEventsProcessed }
      
    } catch (error) {
      console.error('Calendar incremental sync failed:', error)
      throw error
    }
  }

  private async syncCalendarEvents(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    calendarName: string,
    timeMin: Date,
    syncToken: string | null,
    isFullSync: boolean = false,
    timeMax: Date | undefined = undefined
  ): Promise<number> {
    let allEvents: any[] = []
    let pageToken: string | undefined
    let eventsProcessed = 0
    
    do {
      await GoogleAuthHelper.checkRateLimit(this.userId, 100) // Calendar API has lower rate limits
      
      const requestParams: any = {
        calendarId,
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
        pageToken
      }
      
      if (isFullSync) {
        requestParams.timeMin = timeMin.toISOString()
        requestParams.timeMax = timeMax ? timeMax.toISOString() : new Date().toISOString()
      } else if (syncToken) {
        requestParams.syncToken = syncToken
      }
      
      const eventsResponse = await GoogleAuthHelper.withRetry(async () => {
        return await calendar.events.list(requestParams)
      })
      
      const events = eventsResponse.data.items || []
      allEvents.push(...events)
      
      pageToken = eventsResponse.data.nextPageToken || undefined
      
      console.log(`Fetched ${events.length} events from calendar ${calendarId}, total: ${allEvents.length}`)
      
      // If we have a sync token, store it for next incremental sync
      if (eventsResponse.data.nextSyncToken && isFullSync) {
        await this.storeSyncToken(calendarId, eventsResponse.data.nextSyncToken)
      }
      
    } while (pageToken && allEvents.length < 10000) // Reasonable limit
    
    // Process events in batches
    const batchSize = 50
    for (let i = 0; i < allEvents.length; i += batchSize) {
      const batch = allEvents.slice(i, i + batchSize)
      const processed = await this.processBatch(batch, calendarId, calendarName)
      eventsProcessed += processed
      
      console.log(`Processed ${eventsProcessed}/${allEvents.length} events for calendar ${calendarId}`)
    }
    
    return eventsProcessed
  }

  private async syncCalendarEventsIncremental(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    syncToken: string
  ): Promise<{ eventsProcessed: number; newSyncToken: string }> {
    let allEvents: any[] = []
    let pageToken: string | undefined
    let newSyncToken: string = syncToken
    
    do {
      await GoogleAuthHelper.checkRateLimit(this.userId, 100)
      
      const requestParams: any = {
        calendarId,
        syncToken: pageToken ? undefined : syncToken, // Only use syncToken on first request
        pageToken,
        maxResults: 250,
        singleEvents: true
      }
      
      const eventsResponse = await GoogleAuthHelper.withRetry(async () => {
        return await calendar.events.list(requestParams)
      })
      
      const events = eventsResponse.data.items || []
      allEvents.push(...events)
      
      pageToken = eventsResponse.data.nextPageToken || undefined
      
      // Store the new sync token from the last page
      if (eventsResponse.data.nextSyncToken) {
        newSyncToken = eventsResponse.data.nextSyncToken
      }
      
      console.log(`Incremental: Fetched ${events.length} events from calendar ${calendarId}`)
      
    } while (pageToken)
    
    // Process all events (including deletions)
    let eventsProcessed = 0
    const batchSize = 50
    
    for (let i = 0; i < allEvents.length; i += batchSize) {
      const batch = allEvents.slice(i, i + batchSize)
      const processed = await this.processBatch(batch, calendarId, 'Unknown Calendar', true)
      eventsProcessed += processed
    }
    
    return { eventsProcessed, newSyncToken }
  }

  async processBatch(
    eventBatch: calendar_v3.Schema$Event[], 
    calendarId: string, 
    calendarName: string,
    isIncremental: boolean = false
  ): Promise<number> {
    const eventsToInsert: any[] = []
    const eventsToUpdate: any[] = []
    const eventsToDelete: string[] = []
    let processedCount = 0
    
    for (const event of eventBatch) {
      if (!event.id) continue
      
      try {
        // Handle deleted events
        if (event.status === 'cancelled') {
          eventsToDelete.push(event.id)
          processedCount++
          continue
        }
        
        const eventData = await this.transformCalendarEvent(event, calendarId, calendarName)
        if (!eventData) continue
        
        // Check if event exists for incremental sync
        if (isIncremental) {
          const exists = await syncHelpers.calendarEventExists(event.id)
          if (exists) {
            eventsToUpdate.push(eventData)
          } else {
            eventsToInsert.push(eventData)
          }
        } else {
          // For full sync, check if exists to avoid duplicates
          const exists = await syncHelpers.calendarEventExists(event.id)
          if (!exists) {
            eventsToInsert.push(eventData)
          }
        }
        
        processedCount++
        
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error)
        // Continue with other events
      }
    }
    
    // Batch operations
    if (eventsToInsert.length > 0) {
      const insertedEvents = await syncHelpers.batchInsertCalendarEvents(eventsToInsert)
      console.log(`Inserted ${eventsToInsert.length} new events`)
      
      // Queue events for embedding generation
      for (const event of insertedEvents) {
        if (event.embedding_text) {
          await embeddingService.queueForEmbedding('calendar_event', event.id, event.embedding_text)
        }
      }
    }
    
    if (eventsToUpdate.length > 0) {
      for (const eventData of eventsToUpdate) {
        await syncHelpers.updateCalendarEvent(eventData)
      }
      console.log(`Updated ${eventsToUpdate.length} events`)
    }
    
    if (eventsToDelete.length > 0) {
      for (const eventId of eventsToDelete) {
        await syncHelpers.markCalendarEventDeleted(eventId)
      }
      console.log(`Marked ${eventsToDelete.length} events as deleted`)
    }
    
    return processedCount
  }

  private async transformCalendarEvent(event: any, calendarId: string, calendarName: string) {
    if (!event.id) return null
    
    const summary = event.summary || '(No title)'
    const description = event.description || ''
    const location = event.location || ''
    
    // Parse start and end times
    const startTime = event.start?.dateTime || event.start?.date
    const endTime = event.end?.dateTime || event.end?.date
    const isAllDay = !event.start?.dateTime // If no dateTime, it's an all-day event
    
    if (!startTime) return null // Skip events without start time
    
    const startDate = new Date(startTime)
    const endDate = new Date(endTime || startTime)
    
    // Extract attendees
    const attendees = (event.attendees || []).map((attendee: any) => ({
      email: attendee.email?.toLowerCase() || '',
      name: attendee.displayName || '',
      responseStatus: attendee.responseStatus || 'needsAction',
      organizer: attendee.organizer || false
    })).filter((a: any) => a.email)
    
    // Try to link to customer by checking attendee emails
    const attendeeEmails = attendees.map((a: any) => a.email)
    const customerId = await this.findRelatedCustomer(attendeeEmails)
    
    // Determine event type
    let eventType = 'meeting'
    if (isAllDay) eventType = 'all-day'
    if (summary.toLowerCase().includes('focus') || summary.toLowerCase().includes('block')) {
      eventType = 'focus-time'
    }
    
    // Generate embedding text for AI search
    const embeddingText = [
      summary,
      description.substring(0, 1000),
      location,
      attendees.map((a: any) => `${a.name} ${a.email}`).join(' '),
      calendarName
    ].filter(Boolean).join(' ').substring(0, 4000)
    
    return {
      user_id: this.dbUserId,
      customer_id: customerId,
      google_event_id: event.id,
      calendar_id: calendarId,
      calendar_name: calendarName,
      summary: summary,
      description: description,
      location: location,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      is_all_day: isAllDay,
      event_type: eventType,
      attendees: attendees,
      organizer_email: event.organizer?.email?.toLowerCase() || '',
      organizer_name: event.organizer?.displayName || '',
      status: event.status || 'confirmed',
      visibility: event.visibility || 'default',
      is_recurring: !!(event.recurringEventId || event.recurrence),
      recurring_event_id: event.recurringEventId || null,
      recurrence_rule: event.recurrence ? JSON.stringify(event.recurrence) : null,
      conference_data: event.conferenceData ? JSON.stringify(event.conferenceData) : null,
      created_at_google: event.created ? new Date(event.created).toISOString() : null,
      updated_at_google: event.updated ? new Date(event.updated).toISOString() : null,
      raw_event_data: JSON.stringify(event),
      embedding_text: embeddingText,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  private async findRelatedCustomer(emails: string[]): Promise<string | null> {
    for (const email of emails) {
      if (!email || !email.includes('@')) continue
      
      // First try to find by contact email
      const customerByContact = await syncHelpers.findCustomerByContactEmail(email)
      if (customerByContact) return customerByContact
      
      // Then try by domain
      const customerByDomain = await syncHelpers.findCustomerByEmailDomain(email)
      if (customerByDomain) return customerByDomain
    }
    
    return null
  }

  private async storeSyncToken(calendarId: string, syncToken: string) {
    try {
      const integration = await syncHelpers.getUserIntegrations(this.dbUserId, 'google_calendar')
      if (integration && integration.length > 0) {
        const metadata = integration[0].metadata || {}
        const calendarSyncTokens = metadata.calendarSyncTokens || {}
        
        calendarSyncTokens[calendarId] = syncToken
        
        await this.updateSyncMetadata('token_update', {
          ...metadata,
          calendarSyncTokens
        })
      }
    } catch (error) {
      console.error('Error storing sync token:', error)
    }
  }

  private async updateSyncMetadata(syncType: string, metadata: any) {
    try {
      await syncHelpers.updateIntegrationSync(this.dbUserId, 'google_calendar', {
        ...metadata,
        sync_type: syncType
      })
    } catch (error) {
      console.error('Error updating sync metadata:', error)
    }
  }

  // Handle real-time calendar event updates
  async handleEventUpdate(eventData: { id: string }): Promise<void> {
    console.log(`Processing calendar event update for event ${eventData.id}`)
    
    try {
      const calendar = await GoogleAuthHelper.createCalendarClient(this.userId)
      
      // Get full event details
      const event = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventData.id
      })
      
      // Process and store event data
      await this.processBatch([event.data], 'primary', 'Primary Calendar', true)
      
      console.log(`Successfully processed calendar event update for event ${eventData.id}`)
    } catch (error) {
      console.error('Failed to process calendar event update:', error)
      throw error
    }
  }
}