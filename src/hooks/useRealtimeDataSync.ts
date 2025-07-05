import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { showRealtimeToast } from '@/components/ui/realtime-toast'

export interface DataSyncStats {
  emails: {
    total: number
    todayCount: number
    lastAdded: Date | null
  }
  calendar: {
    total: number
    todayCount: number
    lastAdded: Date | null
  }
  lastUpdated: Date
}

export function useRealtimeDataSync() {
  const [stats, setStats] = useState<DataSyncStats>({
    emails: { total: 0, todayCount: 0, lastAdded: null },
    calendar: { total: 0, todayCount: 0, lastAdded: null },
    lastUpdated: new Date()
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentActivity, setRecentActivity] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()

    // Function to fetch current stats
    const fetchStats = async () => {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Fetch email stats
        const [emailsTotal, emailsToday] = await Promise.all([
          supabase.from('emails').select('id', { count: 'exact', head: true }),
          supabase
            .from('emails')
            .select('created_at', { count: 'exact' })
            .gte('created_at', today.toISOString())
        ])

        // Fetch calendar stats  
        const [calendarTotal, calendarToday] = await Promise.all([
          supabase.from('calendar_events').select('id', { count: 'exact', head: true }),
          supabase
            .from('calendar_events')
            .select('created_at', { count: 'exact' })
            .gte('created_at', today.toISOString())
        ])

        // Get most recent items for lastAdded timestamps
        const [recentEmail, recentCalendar] = await Promise.all([
          supabase
            .from('emails')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),
          supabase
            .from('calendar_events')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        ])

        setStats({
          emails: {
            total: emailsTotal.count || 0,
            todayCount: emailsToday.count || 0,
            lastAdded: recentEmail.data?.created_at ? new Date(recentEmail.data.created_at) : null
          },
          calendar: {
            total: calendarTotal.count || 0,
            todayCount: calendarToday.count || 0,
            lastAdded: recentCalendar.data?.created_at ? new Date(recentCalendar.data.created_at) : null
          },
          lastUpdated: new Date()
        })
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sync stats')
        console.error('Error fetching sync stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchStats()

    // Helper function to add activity log
    const addActivity = (message: string) => {
      const timestamp = new Date().toLocaleTimeString()
      setRecentActivity(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)])
    }

    // Set up real-time subscription for emails
    const emailSubscription = supabase
      .channel('emails_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emails'
        },
        (payload) => {
          console.log('New email added:', payload)
          const subject = payload.new.subject || 'Untitled'
          addActivity(`📧 New email synced: ${subject}`)
          showRealtimeToast.emailAdded(subject)
          fetchStats()
        }
      )
      .subscribe()

    // Set up real-time subscription for calendar events
    const calendarSubscription = supabase
      .channel('calendar_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calendar_events'
        },
        (payload) => {
          console.log('New calendar event added:', payload)
          const summary = payload.new.summary || 'Untitled Event'
          addActivity(`📅 New event synced: ${summary}`)
          showRealtimeToast.calendarAdded(summary)
          fetchStats()
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      emailSubscription.unsubscribe()
      calendarSubscription.unsubscribe()
    }
  }, [])

  return { stats, isLoading, error, recentActivity }
} 