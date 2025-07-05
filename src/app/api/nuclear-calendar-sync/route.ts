// NUCLEAR CALENDAR SYNC - FETCHES EVERYTHING, NO EXCEPTIONS
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleAuthHelper } from '@/lib/services/google-auth'
import { syncHelpers } from '@/lib/services/sync-helpers'
import { embeddingService } from '@/lib/services/embedding-service'

export async function POST(request: NextRequest) {
  console.log('💥💥💥 NUCLEAR CALENDAR SYNC INITIATED 💥💥💥')
  const startTime = Date.now()
  
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const enableEmbeddings = body.enableEmbeddings || false
    console.log(`🤖 Embeddings: ${enableEmbeddings ? 'ENABLED' : 'DISABLED'}`)

    // FIXED: Use existing function with try-catch
    let dbUser
    try {
      dbUser = await syncHelpers.getUserByClerkId(userId)
      console.log(`✅ Found existing user: ${dbUser.id}`)
    } catch (error) {
      console.log(`👤 User not found, creating new user for Clerk ID: ${userId}`)
      
      // Create user manually if not found
      const { createClient } = require('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: userId,
          email: `${userId}@temp.placeholder`,
          full_name: 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating user:', createError)
        throw createError
      }
      
      dbUser = newUser
      console.log(`✅ Created new user: ${dbUser.id}`)
    }

    const calendar = await GoogleAuthHelper.createCalendarClient(userId)
    console.log('✅ Google Calendar client ready')

    // Get ALL calendars
    const calendarsResponse = await calendar.calendarList.list()
    const calendars = calendarsResponse.data.items || []
    console.log(`📋 Found ${calendars.length} calendars`)

    let totalEventsFetched = 0
    let totalEventsInDatabase = 0
    const results = []

    for (const cal of calendars) {
      if (!cal.id) continue

      console.log(`\n🚀 SYNCING: "${cal.summary}" (${cal.id})`)

      try {
        // FETCH ALL EVENTS - NO LIMITS WHATSOEVER
        let allEvents: any[] = []
        let pageToken: string | undefined
        let pageCount = 0

        do {
          pageCount++
          console.log(`   📄 Page ${pageCount}...`)
          
          const requestParams: any = {
            calendarId: cal.id,
            maxResults: 2500, // Maximum allowed by Google
            singleEvents: true,
            orderBy: 'startTime',
            pageToken
            // NO timeMin, NO timeMax = EVERYTHING EVER!
          }
          
          const eventsResponse = await calendar.events.list(requestParams)
          const events = eventsResponse.data.items || []
          
          allEvents.push(...events)
          pageToken = eventsResponse.data.nextPageToken || undefined
          
          console.log(`   ✅ Page ${pageCount}: +${events.length} events (total: ${allEvents.length})`)
          
        } while (pageToken && allEvents.length < 100000) // Insane limit
        
        console.log(`📊 FETCHED ${allEvents.length} EVENTS FROM "${cal.summary}"`)
        totalEventsFetched += allEvents.length

        if (allEvents.length === 0) continue

        // Process and save ALL events
        const eventsToSave: any[] = []
        
        for (const event of allEvents) {
          if (!event.id || event.status === 'cancelled') continue

          const startTime = event.start?.dateTime || event.start?.date
          if (!startTime) continue

          const eventData = {
            id: event.id,
            user_id: dbUser.id,
            google_event_id: event.id,
            calendar_id: cal.id,
            calendar_name: cal.summary || 'Unknown Calendar',
            summary: event.summary || '(No title)',
            description: event.description || '',
            location: event.location || '',
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(event.end?.dateTime || event.end?.date || startTime).toISOString(),
            is_all_day: !event.start?.dateTime,
            event_type: 'general',
            attendees: JSON.stringify(event.attendees || []),
            organizer_email: event.organizer?.email || '',
            organizer_name: event.organizer?.displayName || '',
            status: event.status || 'confirmed',
            visibility: event.visibility || 'default',
            customer_id: null,
            conference_data: event.conferenceData ? JSON.stringify(event.conferenceData) : null,
            recurring_event_id: event.recurringEventId || null,
            source: 'google_calendar',
            ical_uid: event.iCalUID || '',
            sequence: event.sequence || 0,
            embedding_text: `${event.summary || ''} ${event.description || ''} ${event.location || ''}`.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          eventsToSave.push(eventData)
        }

        console.log(`💾 SAVING ${eventsToSave.length} EVENTS...`)

        // NUCLEAR SAVE - UPSERT EVERYTHING (use direct Supabase call)
        const { createClient } = require('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: upsertedEvents, error: upsertError } = await supabase
          .from('calendar_events')
          .upsert(eventsToSave, {
            onConflict: 'google_event_id',
            ignoreDuplicates: false
          })
          .select('id')

        if (upsertError) {
          console.error('❌ Upsert failed:', upsertError)
          throw upsertError
        }

        const savedCount = upsertedEvents?.length || eventsToSave.length
        console.log(`✅ SAVED ${savedCount} EVENTS!`)
        totalEventsInDatabase += savedCount

        // Queue for embeddings ONLY if enabled
        if (enableEmbeddings) {
          console.log(`🤖 Queueing ${savedCount} events for embedding...`)
          try {
            for (const event of eventsToSave) {
              if (event.embedding_text) {
                await embeddingService.queueForEmbedding('calendar_event', event.id, event.embedding_text)
              }
            }
            console.log(`✅ Queued ${savedCount} events for embedding`)
          } catch (embeddingError) {
            console.warn(`⚠️ Embedding queue failed (non-critical):`, embeddingError)
          }
        } else {
          console.log(`⚡ Embeddings disabled - skipping queue`)
        }

        results.push({
          calendarName: cal.summary,
          eventsFetched: allEvents.length,
          eventsSaved: savedCount
        })

      } catch (calendarError: any) {
        console.error(`❌ Error syncing "${cal.summary}":`, calendarError)
        results.push({
          calendarName: cal.summary,
          error: calendarError.message,
          eventsFetched: 0,
          eventsSaved: 0
        })
      }
    }

    const totalTime = Date.now() - startTime
    console.log(`\n💥💥💥 NUCLEAR SYNC COMPLETE! 💥💥💥`)
    console.log(`⏱️ Time: ${totalTime}ms`)
    console.log(`📥 Fetched: ${totalEventsFetched} events`)
    console.log(`💾 Saved: ${totalEventsInDatabase} events`)
    console.log(`🤖 Embeddings: ${enableEmbeddings ? 'ENABLED' : 'DISABLED'}`)

    return NextResponse.json({
      success: true,
      message: `NUCLEAR SYNC COMPLETE! Fetched ${totalEventsFetched} events, saved ${totalEventsInDatabase}`,
      totalEventsFetched,
      totalEventsInDatabase,
      calendarsProcessed: calendars.length,
      embeddingsEnabled: enableEmbeddings,
      timeMs: totalTime,
      results
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`💥 NUCLEAR SYNC FAILED:`, error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timeMs: totalTime
    }, { status: 500 })
  }
} 