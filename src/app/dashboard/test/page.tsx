'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Calendar, Settings, Zap, AlertTriangle, CheckCircle, Mail } from 'lucide-react'
import CalendarMeetings from '../components/CalendarMeetings'
import UnreadEmails from '../components/UnreadEmails'

interface SyncStatus {
  running: boolean
  message: string
  success?: boolean
  details?: any
  errorDetails?: string
}

export default function TestPage() {
  const [embeddingsEnabled, setEmbeddingsEnabled] = useState(false) // DISABLED BY DEFAULT
  const [calendarSyncStatus, setCalendarSyncStatus] = useState<SyncStatus>({ running: false, message: 'Ready' })
  const [emailSyncStatus, setEmailSyncStatus] = useState<SyncStatus>({ running: false, message: 'Ready' })
  const [calendarStats, setCalendarStats] = useState<any>(null)
  const [emailStats, setEmailStats] = useState<any>(null)
  const [embeddingStats, setEmbeddingStats] = useState<any>(null)

  // Helper function to safely parse JSON responses
  const safeJsonParse = async (response: Response) => {
    const text = await response.text()
    
    // Check if response is HTML (like an error page)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error(`API returned HTML instead of JSON. Status: ${response.status} ${response.statusText}. This usually means the endpoint doesn't exist or there's an authentication issue.`)
    }
    
    try {
      return JSON.parse(text)
    } catch (e) {
      throw new Error(`Invalid JSON response: ${text.substring(0, 200)}...`)
    }
  }

  // Fetch current stats with better error handling
  const fetchStats = async () => {
    try {
      // Check calendar events in database
      try {
        const calResponse = await fetch('/api/calendar/meetings')
        if (calResponse.ok) {
          const calData = await safeJsonParse(calResponse)
          setCalendarStats({
            totalEvents: calData.count || 0,
            success: calData.success
          })
        } else {
          console.warn('Calendar stats fetch failed:', calResponse.status)
        }
      } catch (error) {
        console.warn('Calendar stats error:', error)
        setCalendarStats({ totalEvents: 'Error', success: false })
      }

      // Check emails in database
      try {
        const emailResponse = await fetch('/api/gmail/unread')
        if (emailResponse.ok) {
          const emailData = await safeJsonParse(emailResponse)
          setEmailStats({
            totalEmails: emailData.count || 0,
            success: emailData.success
          })
        } else {
          console.warn('Email stats fetch failed:', emailResponse.status)
        }
      } catch (error) {
        console.warn('Email stats error:', error)
        setEmailStats({ totalEmails: 'Error', success: false })
      }

      // Check embedding queue if enabled
      if (embeddingsEnabled) {
        try {
          const embResponse = await fetch('/api/sync/embeddings')
          if (embResponse.ok) {
            const embData = await safeJsonParse(embResponse)
            setEmbeddingStats(embData.stats)
          }
        } catch (error) {
          console.warn('Embedding stats error:', error)
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  // NUCLEAR CALENDAR SYNC - FETCH EVERYTHING (with better error handling)
  const triggerNuclearCalendarSync = async () => {
    setCalendarSyncStatus({ running: true, message: '🚨 STARTING NUCLEAR CALENDAR SYNC...' })
    
    try {
      console.log('🚨🚨🚨 NUCLEAR CALENDAR SYNC INITIATED 🚨🚨🚨')
      
      const response = await fetch('/api/nuclear-calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enableEmbeddings: embeddingsEnabled,
          fetchEverything: true
        })
      })
  
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      const result = await safeJsonParse(response)
      
      if (result.success) {
        setCalendarSyncStatus({
          running: false,
          message: `✅ SYNC COMPLETE! Fetched ${result.totalEventsFetched} events, saved ${result.totalEventsInDatabase}`,
          success: true,
          details: result
        })
      } else {
        setCalendarSyncStatus({
          running: false,
          message: `❌ SYNC FAILED: ${result.error}`,
          success: false,
          details: result,
          errorDetails: result.error
        })
      }

      await fetchStats() // Refresh stats
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Calendar sync error:', error)
      
      setCalendarSyncStatus({
        running: false,
        message: `💥 SYNC ERROR: ${errorMessage}`,
        success: false,
        errorDetails: errorMessage
      })
    }
  }

  // NUCLEAR EMAIL SYNC - FETCH EVERYTHING (with better error handling)
  const triggerNuclearEmailSync = async () => {
    setEmailSyncStatus({ running: true, message: '📧 STARTING NUCLEAR EMAIL SYNC...' })
    
    try {
      console.log('📧📧📧 NUCLEAR EMAIL SYNC INITIATED 📧📧📧')
      
      const response = await fetch('/api/nuclear-gmail-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enableEmbeddings: embeddingsEnabled,
          fetchEverything: true
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      const result = await safeJsonParse(response)
      
      if (result.success) {
        setEmailSyncStatus({
          running: false,
          message: `✅ SYNC COMPLETE! Fetched ${result.totalMessagesFetched} messages, saved ${result.totalMessagesInDatabase}`,
          success: true,
          details: result
        })
      } else {
        setEmailSyncStatus({
          running: false,
          message: `❌ SYNC FAILED: ${result.error}`,
          success: false,
          details: result,
          errorDetails: result.error
        })
      }

      await fetchStats() // Refresh stats
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Email sync error:', error)
      
      setEmailSyncStatus({
        running: false,
        message: `💥 SYNC ERROR: ${errorMessage}`,
        success: false,
        errorDetails: errorMessage
      })
    }
  }

  // Process embedding queue manually (if enabled)
  const processEmbeddingQueue = async () => {
    if (!embeddingsEnabled) {
      alert('Embeddings are disabled! Enable them first.')
      return
    }

    try {
      const response = await fetch('/api/sync/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 50 })
      })

      const result = await safeJsonParse(response)
      console.log('Embedding processing result:', result)
      await fetchStats()
    } catch (error) {
      console.error('Embedding processing failed:', error)
    }
  }

  // Load stats on component mount
  useEffect(() => {
    fetchStats()
    // DISABLED: Auto-refresh to stop constant logs
    // const interval = setInterval(fetchStats, 10000) // Every 10 seconds
    // return () => clearInterval(interval)
  }, [embeddingsEnabled])

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🚨 Nuclear Sync Dashboard</h1>
        <p className="text-gray-600 mt-2">
            Ultimate control over calendar and email sync + AI embeddings
          </p>
        </div>
      </div>

      {/* EMBEDDINGS CONTROL SECTION */}
      <Card className="border-2 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-yellow-600" />
            🚨 EMBEDDINGS CONTROL 🚨
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-yellow-300 rounded-lg bg-white">
            <div>
              <h3 className="font-semibold text-lg">AI Embeddings Processing</h3>
              <p className="text-sm text-gray-600">
                {embeddingsEnabled 
                  ? '🤖 Enabled - Sync will queue items for AI processing' 
                  : '⚡ Disabled - Sync will be FAST (no AI processing)'
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={embeddingsEnabled ? "default" : "secondary"}>
                {embeddingsEnabled ? "ENABLED" : "DISABLED"}
              </Badge>
              <Switch
                checked={embeddingsEnabled}
                onCheckedChange={setEmbeddingsEnabled}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </div>

          {/* Embedding Queue Stats */}
          {embeddingsEnabled && embeddingStats && (
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-orange-100 rounded">
                <div className="text-xl font-bold text-orange-600">{embeddingStats.pending}</div>
                <div className="text-xs text-orange-800">Pending</div>
              </div>
              <div className="text-center p-3 bg-blue-100 rounded">
                <div className="text-xl font-bold text-blue-600">{embeddingStats.processing}</div>
                <div className="text-xs text-blue-800">Processing</div>
              </div>
              <div className="text-center p-3 bg-green-100 rounded">
                <div className="text-xl font-bold text-green-600">{embeddingStats.completed}</div>
                <div className="text-xs text-green-800">Completed</div>
              </div>
              <div className="text-center p-3 bg-red-100 rounded">
                <div className="text-xl font-bold text-red-600">{embeddingStats.failed}</div>
                <div className="text-xs text-red-800">Failed</div>
              </div>
            </div>
          )}

          {/* Process Embeddings Button */}
          {embeddingsEnabled && (
            <Button
              onClick={processEmbeddingQueue}
              variant="outline"
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              Process Embedding Queue Now
            </Button>
          )}
        </CardContent>
      </Card>

      {/* NUCLEAR SYNC CONTROLS - SIDE BY SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* NUCLEAR CALENDAR SYNC SECTION */}
        <Card className="border-2 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-600" />
              💥 NUCLEAR CALENDAR SYNC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-red-300 rounded-lg bg-white">
              <h3 className="font-semibold text-lg mb-2">Fetch ALL Calendar Events</h3>
              <p className="text-sm text-gray-600 mb-4">
                Fetches EVERY EVENT from ALL calendars (past, present, future)
              </p>
              
              <Button
                onClick={triggerNuclearCalendarSync}
                disabled={calendarSyncStatus.running}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${calendarSyncStatus.running ? 'animate-spin' : ''}`} />
                {calendarSyncStatus.running ? 'SYNCING...' : '💥 NUCLEAR CALENDAR SYNC'}
              </Button>
            </div>

            {/* Calendar Sync Status - IMPROVED ERROR DISPLAY */}
            <div className={`p-4 rounded-lg border ${
              calendarSyncStatus.success === true ? 'bg-green-50 border-green-200' :
              calendarSyncStatus.success === false ? 'bg-red-50 border-red-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-start gap-2">
                {calendarSyncStatus.running ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600 mt-1" />
                ) : calendarSyncStatus.success === true ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                ) : calendarSyncStatus.success === false ? (
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                ) : null}
                <div className="flex-1">
                  <div className="font-medium text-sm">{calendarSyncStatus.message}</div>
                  
                  {/* Show error details prominently */}
                  {calendarSyncStatus.errorDetails && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs">
                      <strong>Error Details:</strong><br />
                      {calendarSyncStatus.errorDetails}
                    </div>
                  )}
                </div>
              </div>
              
              {calendarSyncStatus.details && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 cursor-pointer hover:underline">
                    View Full Response
                  </summary>
                  <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                    {JSON.stringify(calendarSyncStatus.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            {/* Calendar Stats */}
            {calendarStats && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <div className="text-xl font-bold text-blue-600">
                  {calendarStats.totalEvents}
                </div>
                <div className="text-xs text-gray-600">events in database</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* NUCLEAR EMAIL SYNC SECTION */}
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              📧 NUCLEAR EMAIL SYNC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-green-300 rounded-lg bg-white">
              <h3 className="font-semibold text-lg mb-2">Fetch ALL Gmail Messages</h3>
              <p className="text-sm text-gray-600 mb-4">
                Fetches EVERY EMAIL from your entire Gmail history
              </p>
              
              <Button
                onClick={triggerNuclearEmailSync}
                disabled={emailSyncStatus.running}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${emailSyncStatus.running ? 'animate-spin' : ''}`} />
                {emailSyncStatus.running ? 'SYNCING...' : '📧 NUCLEAR EMAIL SYNC'}
              </Button>
            </div>

            {/* Email Sync Status - IMPROVED ERROR DISPLAY */}
            <div className={`p-4 rounded-lg border ${
              emailSyncStatus.success === true ? 'bg-green-50 border-green-200' :
              emailSyncStatus.success === false ? 'bg-red-50 border-red-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-start gap-2">
                {emailSyncStatus.running ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600 mt-1" />
                ) : emailSyncStatus.success === true ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                ) : emailSyncStatus.success === false ? (
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                ) : null}
                <div className="flex-1">
                  <div className="font-medium text-sm">{emailSyncStatus.message}</div>
                  
                  {/* Show error details prominently */}
                  {emailSyncStatus.errorDetails && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs">
                      <strong>Error Details:</strong><br />
                      {emailSyncStatus.errorDetails}
                    </div>
                  )}
                </div>
              </div>
              
              {emailSyncStatus.details && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 cursor-pointer hover:underline">
                    View Full Response
                  </summary>
                  <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                    {JSON.stringify(emailSyncStatus.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            {/* Email Stats */}
            {emailStats && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                <div className="text-xl font-bold text-purple-600">
                  {emailStats.totalEmails}
                </div>
                <div className="text-xs text-gray-600">emails in database</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* EXISTING DASHBOARD CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Meetings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Calendar Events
            </h2>
          </div>
          <CalendarMeetings />
        </div>

        {/* Unread Emails */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-600" />
              Unread Emails
            </h2>
          </div>
          <UnreadEmails />
        </div>
      </div>
    </div>
  )
}