import { NextRequest, NextResponse } from 'next/server'
import { embeddingService } from '@/lib/services/embedding-service'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🤖 POST /api/sync/embeddings - Processing embedding queue')
  
  try {
    console.log('📝 Parsing request body...')
    const body = await request.json().catch(() => ({}))
    const { 
      batchSize = 10,
      cronSecret 
    } = body
    console.log(`⚙️ Batch size: ${batchSize}`)

    // Verify cron secret for automated processing
    const authHeader = request.headers.get('authorization')
    if (cronSecret && cronSecret !== process.env.CRON_SECRET) {
      console.error('❌ Invalid cron secret provided')
      return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 })
    }
    if (authHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Invalid authorization header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting embedding queue processing...')
    const processingStart = Date.now()
    
    const result = await embeddingService.processEmbeddingQueue(batchSize)
    
    const processingTime = Date.now() - processingStart
    const totalTime = Date.now() - startTime
    
    console.log(`✅ Embedding processing completed in ${processingTime}ms (total: ${totalTime}ms)`)
    console.log(`📊 Results: ${result.processed} processed, ${result.failed} failed`)
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      message: `Processed ${result.processed} embeddings, ${result.failed} failed`,
      timing: { processingMs: processingTime, totalMs: totalTime }
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ Embedding processing failed after ${totalTime}ms:`, error)
    return NextResponse.json({ 
      error: error.message || 'Failed to process embedding queue',
      success: false,
      timing: { totalMs: totalTime }
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('📊 GET /api/sync/embeddings - Fetching queue statistics')
  
  try {
    console.log('🔍 Getting embedding queue stats...')
    const statsStart = Date.now()
    
    const stats = await embeddingService.getQueueStats()
    
    const statsTime = Date.now() - statsStart
    const totalTime = Date.now() - startTime
    
    console.log(`📈 Queue stats retrieved in ${statsTime}ms (total: ${totalTime}ms):`, stats)
    
    return NextResponse.json({
      success: true,
      stats,
      timing: { 
        statsQueryMs: statsTime, 
        totalMs: totalTime 
      }
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ Failed to get embedding stats after ${totalTime}ms:`, error)
    return NextResponse.json({ 
      error: error.message || 'Failed to get queue stats',
      success: false,
      timing: { totalMs: totalTime }
    }, { status: 500 })
  }
} 