import { NextRequest, NextResponse } from 'next/server'
import { GmailSyncService } from '@/lib/services/gmail-sync'
import { CalendarSyncService } from '@/lib/services/calendar-sync'
import { syncHelpers } from '@/lib/services/sync-helpers'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret from Authorization header (Vercel format)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting automated incremental sync for all users')

    // Get all active users with Gmail or Calendar integrations
    const users = await syncHelpers.getUsersWithActiveIntegrations()
    
    if (!users || users.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No users with active integrations found' 
      })
    }

    console.log(`Found ${users.length} users with active integrations`)

    const results = {
      totalUsers: users.length,
      successfulSyncs: 0,
      failedSyncs: 0,
      gmailSyncs: 0,
      calendarSyncs: 0,
      errors: [] as string[]
    }

    // Process each user
    for (const user of users) {
      try {
        console.log(`Processing user: ${user.clerk_id}`)
        
        // Check what integrations this user has
        const integrations = await syncHelpers.getUserIntegrations(user.id)
        
        // Gmail sync
        const gmailIntegration = integrations.find(i => i.platform === 'gmail' && i.is_active)
        if (gmailIntegration) {
          try {
            const gmailSync = new GmailSyncService(user.clerk_id, user.id)
            await gmailSync.performIncrementalSync()
            results.gmailSyncs++
            console.log(`Gmail sync completed for user ${user.clerk_id}`)
          } catch (error: any) {
            console.error(`Gmail sync failed for user ${user.clerk_id}:`, error)
            results.errors.push(`Gmail sync failed for user ${user.clerk_id}: ${error.message}`)
          }
        }

        // Calendar sync
        const calendarIntegration = integrations.find(i => i.platform === 'google_calendar' && i.is_active)
        if (calendarIntegration) {
          try {
            const calendarSync = new CalendarSyncService(user.clerk_id, user.id)
            await calendarSync.performIncrementalSync()
            results.calendarSyncs++
            console.log(`Calendar sync completed for user ${user.clerk_id}`)
          } catch (error: any) {
            console.error(`Calendar sync failed for user ${user.clerk_id}:`, error)
            results.errors.push(`Calendar sync failed for user ${user.clerk_id}: ${error.message}`)
          }
        }

        results.successfulSyncs++

        // Small delay between users to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error: any) {
        console.error(`Error processing user ${user.clerk_id}:`, error)
        results.failedSyncs++
        results.errors.push(`User ${user.clerk_id}: ${error.message}`)
      }
    }

    console.log('Automated incremental sync completed:', results)

    return NextResponse.json({
      success: true,
      message: 'Automated incremental sync completed',
      results
    })

  } catch (error: any) {
    console.error('Automated sync cron job failed:', error)
    return NextResponse.json({ 
      error: error.message || 'Automated sync failed',
      success: false
    }, { status: 500 })
  }
}

// Allow GET for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Incremental sync cron job endpoint',
    status: 'active'
  })
} 