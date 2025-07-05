import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { showRealtimeToast } from '@/components/ui/realtime-toast'

export interface EmbeddingStats {
  pending: number
  processing: number
  completed: number
  failed: number
  total: number
  lastUpdated: Date
}

export function useRealtimeEmbeddingQueue() {
  const [stats, setStats] = useState<EmbeddingStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
    lastUpdated: new Date()
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Function to fetch current stats
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('embedding_queue')
          .select('status')

        if (error) throw error

        // Calculate stats from the data
        const statsCounts = data.reduce((acc, item) => {
          acc[item.status as keyof typeof acc] = (acc[item.status as keyof typeof acc] || 0) + 1
          acc.total += 1
          return acc
        }, {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          total: 0
        })

        setStats({
          ...statsCounts,
          lastUpdated: new Date()
        })
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
        console.error('Error fetching embedding stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchStats()

    // Set up real-time subscription
    const subscription = supabase
      .channel('embedding_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'embedding_queue'
        },
        (payload) => {
          console.log('Real-time update received:', payload)
          // Refetch stats when any change occurs
          fetchStats()
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          showRealtimeToast.connectionStatus(true)
        } else if (status === 'CLOSED') {
          showRealtimeToast.connectionStatus(false)
        }
      })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { stats, isLoading, error }
} 