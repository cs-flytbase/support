import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { syncHelpers } from '@/lib/services/sync-helpers'

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

    // Get query parameters
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const convertCalendarEvents = url.searchParams.get('convert') === 'true'

    // Get meetings from the meetings table
    const meetings = await syncHelpers.getUserMeetings(dbUser.id, limit)

    // If no meetings and user wants to convert calendar events
    if (meetings.length === 0 && convertCalendarEvents) {
      console.log('No meetings found, converting calendar events to meetings...')
      const convertedMeetings = await syncHelpers.convertCalendarEventsToMeetings(dbUser.id)
      
      return NextResponse.json({
        success: true,
        meetings: convertedMeetings || [],
        count: convertedMeetings?.length || 0,
        message: `Converted ${convertedMeetings?.length || 0} calendar events to meetings`
      })
    }

    return NextResponse.json({
      success: true,
      meetings: meetings || [],
      count: meetings?.length || 0
    })

  } catch (error: any) {
    console.error('Error fetching meetings:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch meetings',
      success: false
    }, { status: 500 })
  }
}

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
        error: 'User not found in database.' 
      }, { status: 404 })
    }

    const body = await request.json()
    const action = body.action

    if (action === 'convert_calendar_events') {
      // Convert calendar events to meetings
      const eventIds = body.eventIds // Optional: specific event IDs to convert
      
      console.log(`Converting calendar events to meetings for user ${userId}`)
      const convertedMeetings = await syncHelpers.convertCalendarEventsToMeetings(
        dbUser.id, 
        eventIds
      )

      return NextResponse.json({
        success: true,
        message: `Successfully converted ${convertedMeetings.length} calendar events to meetings`,
        meetings: convertedMeetings,
        count: convertedMeetings.length
      })
    }

    return NextResponse.json({ 
      error: 'Invalid action. Supported actions: convert_calendar_events' 
    }, { status: 400 })

  } catch (error: any) {
    console.error('Error processing meetings request:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to process meetings request',
      success: false
    }, { status: 500 })
  }
} 