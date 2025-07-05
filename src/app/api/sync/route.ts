import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { GmailSyncService } from '@/lib/services/gmail-sync'
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
        error: 'User not found in database. Please sign out and sign in again to complete setup.' 
      }, { status: 404 })
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { 
      services = ['gmail', 'calendar'], // Default to both services
      syncType = 'incremental', // 'full' or 'incremental'
      daysBack = 365 // Default to 1 year for full sync
    } = body

    console.log(`Starting ${syncType} sync for user ${userId}, services: ${services.join(', ')}`)

    const results: any = {
      success: true,
      gmail: null,
      calendar: null,
      startedAt: new Date().toISOString()
    }

    // Gmail sync
    if (services.includes('gmail')) {
      try {
        console.log('Starting Gmail sync...')
        const gmailSync = new GmailSyncService(userId, dbUser.id)
        
        if (syncType === 'full') {
          results.gmail = await gmailSync.performFullSync(daysBack)
        } else {
          results.gmail = await gmailSync.performIncrementalSync()
        }
        
        console.log('Gmail sync completed')
      } catch (error: any) {
        console.error('Gmail sync failed:', error)
        results.gmail = { 
          success: false, 
          error: error.message || 'Gmail sync failed' 
        }
      }
    }

    // Calendar sync
    if (services.includes('calendar')) {
      try {
        console.log('Starting Calendar sync...')
        const calendarSync = new CalendarSyncService(userId, dbUser.id)
        
        if (syncType === 'full') {
          results.calendar = await calendarSync.performFullSync(daysBack)
        } else {
          results.calendar = await calendarSync.performIncrementalSync()
        }
        
        console.log('Calendar sync completed')
      } catch (error: any) {
        console.error('Calendar sync failed:', error)
        results.calendar = { 
          success: false, 
          error: error.message || 'Calendar sync failed' 
        }
      }
    }

    results.completedAt = new Date().toISOString()
    results.duration = new Date(results.completedAt).getTime() - new Date(results.startedAt).getTime()

    // Determine overall success
    const hasErrors = (results.gmail && !results.gmail.success) || 
                     (results.calendar && !results.calendar.success)
    
    if (hasErrors) {
      results.success = false
    }

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('Sync operation failed:', error)
    
    // Handle specific errors
    if (error.code === 401) {
      return NextResponse.json({ 
        error: 'Google authentication expired. Please reconnect your account.',
        success: false 
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      error: error.message || 'Sync operation failed',
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

    // Get sync status from user integrations
    const integrations = await syncHelpers.getUserIntegrations(dbUser.id)
    
    const gmailIntegration = integrations.find(i => i.platform === 'gmail')
    const calendarIntegration = integrations.find(i => i.platform === 'google_calendar')

    return NextResponse.json({
      success: true,
      userId: dbUser.id,
      integrations: {
        gmail: gmailIntegration ? {
          isActive: gmailIntegration.is_active,
          lastSyncAt: gmailIntegration.last_sync_at,
          metadata: gmailIntegration.metadata
        } : null,
        calendar: calendarIntegration ? {
          isActive: calendarIntegration.is_active,
          lastSyncAt: calendarIntegration.last_sync_at,
          metadata: calendarIntegration.metadata
        } : null
      }
    })

  } catch (error: any) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch sync status',
      success: false
    }, { status: 500 })
  }
} 