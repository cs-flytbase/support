import { NextRequest, NextResponse } from 'next/server'
import { GmailSyncService } from '@/lib/services/gmail-sync'
import { syncHelpers } from '@/lib/services/sync-helpers'

export async function POST(request: NextRequest) {
  try {
    // Parse the webhook payload
    const body = await request.json().catch(() => ({}))
    const { 
      message, 
      subscription,
      userId, // Custom field we can add
      internalToken // Security token
    } = body

    // Verify internal token for security
    if (internalToken !== process.env.INTERNAL_API_TOKEN) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('Gmail webhook received:', { message, subscription, userId })

    // If no specific user, we'll need to handle this differently
    // For now, let's assume we have a user ID
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get database user
    const dbUser = await syncHelpers.getUserByClerkId(userId)
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Trigger incremental sync for this user
    const gmailSync = new GmailSyncService(userId, dbUser.id)
    const result = await gmailSync.performIncrementalSync()

    return NextResponse.json({
      success: true,
      message: 'Incremental sync triggered',
      result
    })

  } catch (error: any) {
    console.error('Gmail webhook error:', error)
    return NextResponse.json({ 
      error: error.message || 'Webhook processing failed',
      success: false
    }, { status: 500 })
  }
}

// Handle webhook verification (if needed by Gmail)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const challenge = searchParams.get('hub.challenge')
    
    if (challenge) {
      return new NextResponse(challenge, { status: 200 })
    }
    
    return NextResponse.json({ message: 'Gmail webhook endpoint active' })
    
  } catch (error: any) {
    console.error('Gmail webhook verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
} 