import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// Initialize OpenAI client only when needed
let openai: OpenAI | null = null

const getOpenAIClient = () => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

// Use regular supabase-js client for server-side operations with service role
const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

interface QueueItem {
  id: string
  item_type: 'email' | 'calendar_event'
  item_id: string
  embedding_text: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at?: string
  processed_at?: string
  error_message?: string
}

export class EmbeddingService {
  private static instance: EmbeddingService
  
  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService()
    }
    return EmbeddingService.instance
  }

  // Generate embedding for text using OpenAI
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Clean and truncate text for embedding
      const cleanText = text.replace(/\s+/g, ' ').trim().substring(0, 8000)
      
      const client = getOpenAIClient()
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small', // Cost-effective model
        input: cleanText,
        encoding_format: 'float',
      })

      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw error
    }
  }

  // Add item to embedding queue
  async queueForEmbedding(itemType: 'email' | 'calendar_event', itemId: string, embeddingText: string) {
    try {
      const supabase = createAdminClient()
      
      const { error } = await supabase
        .from('embedding_queue')
        .insert({
          item_type: itemType,
          item_id: itemId,
          embedding_text: embeddingText,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (error) throw error
      console.log(`Queued ${itemType} ${itemId} for embedding`)
    } catch (error) {
      console.error('Error queueing for embedding:', error)
      throw error
    }
  }

  // Process embedding queue in batches
  async processEmbeddingQueue(batchSize: number = 10): Promise<{ processed: number; failed: number }> {
    try {
      const supabase = createAdminClient()
      
      // Get pending items from queue
      const { data: queueItems, error: fetchError } = await supabase
        .from('embedding_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(batchSize)

      if (fetchError) throw fetchError
      if (!queueItems || queueItems.length === 0) {
        return { processed: 0, failed: 0 }
      }

      console.log(`Processing ${queueItems.length} embedding queue items`)

      let processed = 0
      let failed = 0

      for (const item of queueItems as QueueItem[]) {
        try {
          // Mark as processing
          await supabase
            .from('embedding_queue')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', item.id)

          // Generate embedding
          const embedding = await this.generateEmbedding(item.embedding_text)

          // Update the actual table with embedding
          if (item.item_type === 'email') {
            await supabase
              .from('email')
              .update({ 
                embedding: JSON.stringify(embedding),
                updated_at: new Date().toISOString()
              })
              .eq('id', item.item_id)
          } else if (item.item_type === 'calendar_event') {
            await supabase
              .from('calendar_events')
              .update({ 
                embedding: JSON.stringify(embedding),
                updated_at: new Date().toISOString()
              })
              .eq('id', item.item_id)
          }

          // Mark as completed
          await supabase
            .from('embedding_queue')
            .update({ 
              status: 'completed', 
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)

          processed++
          console.log(`Generated embedding for ${item.item_type} ${item.item_id}`)

          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100))

        } catch (error) {
          console.error(`Failed to process embedding for ${item.item_type} ${item.item_id}:`, error)
          
          // Mark as failed
          await supabase
            .from('embedding_queue')
            .update({ 
              status: 'failed', 
              error_message: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)

          failed++
        }
      }

      console.log(`Embedding processing complete: ${processed} processed, ${failed} failed`)
      return { processed, failed }

    } catch (error) {
      console.error('Error processing embedding queue:', error)
      throw error
    }
  }

  // Clean up old completed/failed queue items
  async cleanupQueue(daysOld: number = 7): Promise<number> {
    try {
      const supabase = createAdminClient()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { data, error } = await supabase
        .from('embedding_queue')
        .delete()
        .in('status', ['completed', 'failed'])
        .lt('updated_at', cutoffDate.toISOString())
        .select('id')

      if (error) throw error
      
      const deletedCount = data?.length || 0
      console.log(`Cleaned up ${deletedCount} old queue items`)
      return deletedCount

    } catch (error) {
      console.error('Error cleaning up queue:', error)
      throw error
    }
  }

  // Get queue statistics (OPTIMIZED VERSION)
  async getQueueStats(): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
  }> {
    const startTime = Date.now()
    console.log('📊 EmbeddingService: Getting queue stats...')
    
    try {
      const supabase = createAdminClient()
      console.log('🔗 Supabase client created')
      
      // Try the optimized RPC function first
      console.log('⚡ Attempting optimized RPC query...')
      const rpcStart = Date.now()
      
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_embedding_queue_stats_fast')
      
      if (!rpcError && rpcData && rpcData.length > 0) {
        const rpcTime = Date.now() - rpcStart
        const totalTime = Date.now() - startTime
        
        const stats = {
          pending: Number(rpcData[0].pending),
          processing: Number(rpcData[0].processing),
          completed: Number(rpcData[0].completed),
          failed: Number(rpcData[0].failed)
        }
        
        console.log(`⚡ RPC stats completed in ${rpcTime}ms (total: ${totalTime}ms):`, stats)
        return stats
      }
      
      console.log('⚠️ RPC function not available, falling back to manual count')
      console.log('RPC Error:', rpcError)
      
      // Fallback to manual counting with detailed logging
      return await this.getQueueStatsFallback()

    } catch (error) {
      const totalTime = Date.now() - startTime
      console.error(`❌ getQueueStats failed after ${totalTime}ms:`, error)
      
      // Final fallback
      return await this.getQueueStatsFallback()
    }
  }

  // Fallback method with detailed performance logging
  async getQueueStatsFallback(): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
  }> {
    const startTime = Date.now()
    console.log('🐌 FALLBACK: Using row-by-row counting (this explains the 141ms delay!)...')
    
    try {
      const supabase = createAdminClient()
      
      console.log('📥 Fetching ALL rows from embedding_queue...')
      const queryStart = Date.now()
      
      const { data, error } = await supabase
        .from('embedding_queue')
        .select('status')

      const queryTime = Date.now() - queryStart
      const rowCount = data?.length || 0
      console.log(`📊 Database query: ${rowCount} rows fetched in ${queryTime}ms`)

      if (error) {
        console.error('❌ Database query failed:', error)
        throw error
      }

      console.log('🔢 Counting rows in JavaScript (the slow part)...')
      const countStart = Date.now()
      
      const stats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
      }

      let invalidStatusCount = 0
      data?.forEach((item, index) => {
        if (item.status in stats) {
          stats[item.status as keyof typeof stats]++
        } else {
          invalidStatusCount++
        }
        
        // Log progress for large datasets
        if (index % 1000 === 0 && index > 0) {
          console.log(`   Processed ${index}/${rowCount} rows...`)
        }
      })

      const countTime = Date.now() - countStart
      const totalTime = Date.now() - startTime
      
      console.log(`🔢 JavaScript counting: ${countTime}ms`)
      console.log(`📊 Total fallback time: ${totalTime}ms`)
      console.log(`📈 Final stats:`, stats)
      
      if (invalidStatusCount > 0) {
        console.warn(`⚠️ Found ${invalidStatusCount} rows with invalid status values`)
      }
      
      console.log('💡 TIP: Run the SQL function creation script to improve performance!')
      console.log('💡 Current method scales O(n) with queue size - RPC function is O(1)')

      return stats
    } catch (error) {
      console.error('❌ Fallback stats method failed:', error)
      throw error
    }
  }

  // Search similar content using embeddings
  async searchSimilar(
    queryText: string, 
    contentType: 'email' | 'calendar_event' | 'both' = 'both',
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<any[]> {
    try {
      const supabase = createAdminClient()
      
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(queryText)
      
      let results: any[] = []

      // Search emails
      if (contentType === 'email' || contentType === 'both') {
        const { data: emailResults, error: emailError } = await supabase.rpc(
          'search_similar_emails',
          {
            query_embedding: JSON.stringify(queryEmbedding),
            match_threshold: threshold,
            match_count: limit
          }
        )

        if (!emailError && emailResults) {
          results.push(...emailResults.map((r: any) => ({ ...r, type: 'email' })))
        }
      }

      // Search calendar events
      if (contentType === 'calendar_event' || contentType === 'both') {
        const { data: calendarResults, error: calendarError } = await supabase.rpc(
          'search_similar_calendar_events',
          {
            query_embedding: JSON.stringify(queryEmbedding),
            match_threshold: threshold,
            match_count: limit
          }
        )

        if (!calendarError && calendarResults) {
          results.push(...calendarResults.map((r: any) => ({ ...r, type: 'calendar_event' })))
        }
      }

      // Sort by similarity score
      results.sort((a, b) => b.similarity - a.similarity)
      
      return results.slice(0, limit)

    } catch (error) {
      console.error('Error searching similar content:', error)
      throw error
    }
  }
}

export const embeddingService = EmbeddingService.getInstance() 