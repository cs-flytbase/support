// components/CalendarMeetings.tsx
'use client'
import { useState, useEffect } from 'react'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'

interface CalendarEvent {
  id: string
  summary: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus: string
  }>
  htmlLink: string
  location?: string
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string
      uri: string
      label?: string
    }>
  }
}

interface MeetingsData {
  events: CalendarEvent[]
  loading: boolean
  error?: string
  debug?: any
}

export default function CalendarMeetings() {
  const [meetingsData, setMeetingsData] = useState<MeetingsData>({
    events: [],
    loading: true
  })

  useEffect(() => {
    fetchMeetings()
  }, [])

  const fetchMeetings = async () => {
    console.log('📊 CalendarMeetings: Starting fetch...')
    
    try {
      setMeetingsData(prev => ({ ...prev, loading: true, error: undefined }))
      
      console.log('🌐 CalendarMeetings: Making API request to /api/calendar/meetings')
      const response = await fetch('/api/calendar/meetings')
      
      console.log('📡 CalendarMeetings: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ CalendarMeetings: API request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500) // First 500 chars
        })
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      console.log('📜 CalendarMeetings: Parsing JSON response...')
      const data = await response.json()
      
      console.log('✅ CalendarMeetings: JSON parsed successfully:', {
        success: data.success,
        eventCount: data.events?.length || 0,
        count: data.count,
        hasDebug: !!data.debug,
        message: data.message
      })
      
      if (data.debug) {
        console.log('🔍 CalendarMeetings: API Debug info:', data.debug)
      }
      
      if (!data.success) {
        console.error('❌ CalendarMeetings: API returned success=false:', data.error)
        throw new Error(data.error || 'API returned success=false')
      }
      
      if (!data.events) {
        console.warn('⚠️ CalendarMeetings: No events property in response')
        console.log('📄 CalendarMeetings: Full response:', data)
      }
      
      const events = data.events || []
      console.log(`📅 CalendarMeetings: Processing ${events.length} events...`)
      
      // Validate each event structure
      events.forEach((event: any, index: number) => {
        console.log(`   Event ${index + 1}: "${event.summary}" - Start: ${event.start?.dateTime || event.start?.date || 'MISSING'}`)
        
        if (!event.start) {
          console.error(`❌ Event ${index + 1} missing start time:`, event)
        }
        if (!event.end) {
          console.error(`❌ Event ${index + 1} missing end time:`, event)
        }
        if (!event.start?.dateTime && !event.start?.date) {
          console.error(`❌ Event ${index + 1} missing dateTime and date:`, event.start)
        }
      })
      
      setMeetingsData({
        events: events,
        loading: false,
        debug: data.debug
      })
      
      console.log('✅ CalendarMeetings: State updated successfully')
      
    } catch (error) {
      console.error('❌ CalendarMeetings: Fetch failed:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined
      })
      
      setMeetingsData({
        events: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load meetings'
      })
    }
  }

  const formatEventTime = (event: CalendarEvent) => {
    console.log(`🕐 Formatting time for event: "${event.summary}"`, {
      startDateTime: event.start.dateTime,
      startDate: event.start.date,
      endDateTime: event.end.dateTime,
      endDate: event.end.date
    })
    
    try {
      if (event.start.dateTime) {
        const startTime = parseISO(event.start.dateTime)
        const endTime = parseISO(event.end.dateTime!)
        
        if (isToday(startTime)) {
          return `Today ${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
        } else if (isTomorrow(startTime)) {
          return `Tomorrow ${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
        } else {
          return `${format(startTime, 'MMM d, h:mm a')} - ${format(endTime, 'h:mm a')}`
        }
      } else if (event.start.date) {
        const date = parseISO(event.start.date)
        return `${format(date, 'MMM d')} (All day)`
      }
      
      console.warn('⚠️ Event has no valid start time:', event)
      return 'Time TBD'
    } catch (error) {
      console.error('❌ Error formatting time for event:', event.summary, error)
      return 'Invalid time'
    }
  }

  const getJoinLink = (event: CalendarEvent) => {
    const meetLink = event.conferenceData?.entryPoints?.find(
      entry => entry.entryPointType === 'video'
    )
    return meetLink?.uri
  }

  if (meetingsData.loading) {
    console.log('🔄 CalendarMeetings: Rendering loading state')
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (meetingsData.error) {
    console.log('❌ CalendarMeetings: Rendering error state:', meetingsData.error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm font-medium">Error loading meetings:</p>
          <p className="text-red-600 text-sm mt-1">{meetingsData.error}</p>
          {meetingsData.debug && (
            <details className="mt-2">
              <summary className="text-xs text-red-500 cursor-pointer hover:underline">
                Debug info
              </summary>
              <pre className="text-xs text-red-500 mt-1 overflow-auto">
                {JSON.stringify(meetingsData.debug, null, 2)}
              </pre>
            </details>
          )}
          <button 
            onClick={fetchMeetings}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (meetingsData.events.length === 0) {
    console.log('📭 CalendarMeetings: Rendering empty state')
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No meetings found</p>
          <p className="text-gray-400 text-sm mt-1">
            Try running a calendar sync to fetch recent events
          </p>
          <button 
            onClick={fetchMeetings}
            className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  console.log(`📅 CalendarMeetings: Rendering ${meetingsData.events.length} events`)
  
  return (
    <div className="p-6">
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {meetingsData.events.map((event, index) => {
          console.log(`📝 Rendering event ${index + 1}: ${event.summary}`)
          
          return (
            <div 
              key={event.id} 
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {event.summary}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatEventTime(event)}
                  </p>
                  
                  {event.location && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.location}
                    </p>
                  )}
                  
                  {event.attendees && event.attendees.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {getJoinLink(event) && (
                    <a
                      href={getJoinLink(event)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Join
                    </a>
                  )}
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                  >
                    View
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={fetchMeetings}
          disabled={meetingsData.loading}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${meetingsData.loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh ({meetingsData.events.length} events)
        </button>
      </div>
      
      {meetingsData.debug && (
        <details className="mt-4 text-xs">
          <summary className="text-gray-500 cursor-pointer hover:underline">
            Debug Information
          </summary>
          <pre className="text-gray-500 mt-2 p-2 bg-gray-50 rounded overflow-auto">
            {JSON.stringify(meetingsData.debug, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}