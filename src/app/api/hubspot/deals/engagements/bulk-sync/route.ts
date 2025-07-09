import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { HubSpotSyncService } from '@/lib/services/hubspot-sync'

export async function POST() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hubspotSync = new HubSpotSyncService()
    
    const startTime = new Date()
    
    try {
      const result = await hubspotSync.syncAllUserDealEngagements(userId)
      
      const endTime = new Date()
      const duration = (endTime.getTime() - startTime.getTime()) / 1000

      return NextResponse.json({
        success: true,
        stats: {
          syncedEngagements: result.synced,
          startTime,
          endTime,
          duration: `${duration.toFixed(2)}s`,
          errors: result.errors,
          errorCount: result.errors.length
        }
      })

    } catch (error) {
      const errorMsg = `Bulk engagements sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Bulk engagements sync error:', error)
      
      return NextResponse.json({
        success: false,
        error: errorMsg
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Bulk deal engagements sync error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync all deal engagements', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 