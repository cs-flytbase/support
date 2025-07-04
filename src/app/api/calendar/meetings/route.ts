// app/api/calendar/meetings/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { CalendarSyncService } from '@/lib/services/calendar-sync'
import { syncHelpers } from '@/lib/services/sync-helpers'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get database user
    const dbUser = await syncHelpers.getUserByClerkId(userId)
    if (!dbUser) {
      return NextResponse.json({ 
        error: 'User not found in database. Please complete setup first.' 
      }, { status: 404 })
    }

    // Parse request body for optional parameters
    const body = await request.json().catch(() => ({}))
    const syncType = body.syncType || 'incremental' // 'full' or 'incremental'
    const daysBack = body.daysBack || 365 // Default to 1 year for full sync

    console.log(`Starting Calendar ${syncType} sync for user ${userId}`)

    // Create sync service and perform sync
    const calendarSync = new CalendarSyncService(userId, dbUser.id)
    
    let result
    if (syncType === 'full') {
      result = await calendarSync.performFullSync(daysBack)
    } else {
      result = await calendarSync.performIncrementalSync()
    }

    return NextResponse.json({
      message: `Calendar ${syncType} sync completed`,
      ...result
    })

  } catch (error: any) {
    console.error('Calendar sync failed:', error)
    
    // Handle specific errors
    if (error.code === 401) {
      return NextResponse.json({ 
        error: 'Google authentication expired. Please reconnect your account.' 
      }, { status: 401 })
    }
    
    if (error.code === 403) {
      return NextResponse.json({ 
        error: 'Calendar access denied. Please check your permissions.' 
      }, { status: 403 })
    }

    return NextResponse.json({ 
      error: error.message || 'Calendar sync failed',
      success: false
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get database user
    const dbUser = await syncHelpers.getUserByClerkId(userId)
    if (!dbUser) {
      return NextResponse.json({ 
        error: 'User not found in database.' 
      }, { status: 404 })
    }

    // Get recent calendar events from database
    const { createClient } = require('@supabase/supabase-js')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        error: 'Supabase configuration missing. Please check environment variables.' 
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: dbEvents, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', dbUser.id)
      .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('start_time', { ascending: true })
      .limit(50)

    if (error) {
      console.error('Error fetching calendar events:', error)
      return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 })
    }

    // Transform database events to match the expected frontend structure
    const transformedEvents = (dbEvents || []).map((event: any) => ({
      id: event.id,
      summary: event.summary || 'Untitled Event',
      start: {
        dateTime: event.start_time,
        timeZone: 'UTC'
      },
      end: {
        dateTime: event.end_time,
        timeZone: 'UTC'
      },
      attendees: event.attendees ? (typeof event.attendees === 'string' ? JSON.parse(event.attendees) : event.attendees) : [],
      htmlLink: event.google_event_id ? `https://calendar.google.com/calendar/event?eid=${event.google_event_id}` : '#',
      location: event.location || '',
      conferenceData: event.conference_data ? (typeof event.conference_data === 'string' ? JSON.parse(event.conference_data) : event.conference_data) : null,
      organizer: {
        email: event.organizer_email || '',
        displayName: event.organizer_name || ''
      },
      status: event.status || 'confirmed',
      description: event.description || ''
    }))

    return NextResponse.json({
      success: true,
      events: transformedEvents,
      count: transformedEvents.length
    })

  } catch (error: any) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch calendar events',
      success: false
    }, { status: 500 })
  }
}