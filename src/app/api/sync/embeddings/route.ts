import { NextRequest, NextResponse } from 'next/server'
import { embeddingService } from '@/lib/services/embedding-service'

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json().catch(() => ({}))
    const { 
      batchSize = 10, // Process 10 items at a time by default
      cronSecret 
    } = body

    // Verify cron secret for automated processing (support both formats)
    const authHeader = request.headers.get('authorization')
    if (cronSecret && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 })
    }
    if (authHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`Processing embedding queue with batch size: ${batchSize}`)

    // Process the embedding queue
    const result = await embeddingService.processEmbeddingQueue(batchSize)
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      message: `Processed ${result.processed} embeddings, ${result.failed} failed`
    })

  } catch (error: any) {
    console.error('Error processing embedding queue:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to process embedding queue',
      success: false
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get queue statistics
    const stats = await embeddingService.getQueueStats()
    
    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error: any) {
    console.error('Error getting embedding queue stats:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to get queue stats',
      success: false
    }, { status: 500 })
  }
} 