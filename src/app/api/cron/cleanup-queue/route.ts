import { NextRequest, NextResponse } from 'next/server'
import { embeddingService } from '@/lib/services/embedding-service'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const body = await request.json().catch(() => ({}))
    const { cronSecret, daysOld = 7 } = body

    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 })
    }

    console.log(`Starting automated queue cleanup - removing items older than ${daysOld} days`)

    // Clean up old queue items
    const deletedCount = await embeddingService.cleanupQueue(daysOld)
    
    console.log(`Automated queue cleanup completed: ${deletedCount} items removed`)

    return NextResponse.json({
      success: true,
      message: 'Automated queue cleanup completed',
      deletedCount
    })

  } catch (error: any) {
    console.error('Automated queue cleanup failed:', error)
    return NextResponse.json({ 
      error: error.message || 'Automated queue cleanup failed',
      success: false
    }, { status: 500 })
  }
}

// Allow GET for testing
export async function GET(request: NextRequest) {
  try {
    const stats = await embeddingService.getQueueStats()
    return NextResponse.json({ 
      message: 'Queue cleanup cron job endpoint',
      status: 'active',
      queueStats: stats
    })
  } catch (error: any) {
    return NextResponse.json({ 
      message: 'Queue cleanup cron job endpoint',
      status: 'active',
      error: error.message
    })
  }
} 