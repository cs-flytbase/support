import { NextRequest, NextResponse } from 'next/server'
import { embeddingService } from '@/lib/services/embedding-service'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret from Authorization header (Vercel format)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting automated embedding processing')

    // Process embedding queue with larger batch size for cron jobs
    const result = await embeddingService.processEmbeddingQueue(25)
    
    console.log('Automated embedding processing completed:', result)

    return NextResponse.json({
      success: true,
      message: 'Automated embedding processing completed',
      processed: result.processed,
      failed: result.failed
    })

  } catch (error: any) {
    console.error('Automated embedding processing failed:', error)
    return NextResponse.json({ 
      error: error.message || 'Automated embedding processing failed',
      success: false
    }, { status: 500 })
  }
}

// Allow GET for testing
export async function GET(request: NextRequest) {
  try {
    const stats = await embeddingService.getQueueStats()
    return NextResponse.json({ 
      message: 'Embedding processing cron job endpoint',
      status: 'active',
      queueStats: stats
    })
  } catch (error: any) {
    return NextResponse.json({ 
      message: 'Embedding processing cron job endpoint',
      status: 'active',
      error: error.message
    })
  }
} 