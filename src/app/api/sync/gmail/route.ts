// app/api/sync/gmail/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { GmailSyncService } from "../../../../lib/services/gmail-sync"
import { syncHelpers } from "../../../../lib/services/sync-helpers"

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

    console.log(`Starting Gmail ${syncType} sync for user ${userId}`)

    // Create sync service and perform sync
    const gmailSync = new GmailSyncService(userId, dbUser.id)
    
    let result
    if (syncType === 'full') {
      result = await gmailSync.performFullSync(daysBack)
    } else {
      result = await gmailSync.performIncrementalSync()
    }

    return NextResponse.json({
      message: `Gmail ${syncType} sync completed`,
      ...result
    })

  } catch (error: any) {
    console.error('Gmail sync failed:', error)
    
    // Handle specific errors
    if (error.code === 401) {
      return NextResponse.json({ 
        error: 'Google authentication expired. Please reconnect your account.' 
      }, { status: 401 })
    }
    
    if (error.code === 403) {
      return NextResponse.json({ 
        error: 'Gmail access denied. Please check your permissions.' 
      }, { status: 403 })
    }

    return NextResponse.json({ 
      error: error.message || 'Gmail sync failed',
      success: false
    }, { status: 500 })
  }
}
