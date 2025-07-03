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
    try {
      setMeetingsData(prev => ({ ...prev, loading: true, error: undefined }))
      
      const response = await fetch('/api/calendar/meetings')
      if (!response.ok) {
        throw new Error('Failed to fetch meetings')
      }
      
      const data = await response.json()
      setMeetingsData({
        events: data.events || [],
        loading: false
      })
    } catch (error) {
      console.error('Error fetching meetings:', error)
      setMeetingsData({
        events: [],
        loading: false,
        error: 'Failed to load meetings'
      })
    }
  }

  const formatEventTime = (event: CalendarEvent) => {
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
    return 'Time TBD'
  }

  const getJoinLink = (event: CalendarEvent) => {
    const meetLink = event.conferenceData?.entryPoints?.find(
      entry => entry.entryPointType === 'video'
    )
    return meetLink?.uri
  }

  if (meetingsData.loading) {
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
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{meetingsData.error}</p>
          <button 
            onClick={fetchMeetings}
            className="mt-2 text-sm text-red-800 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (meetingsData.events.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No meetings scheduled for today</p>
          <button 
            onClick={fetchMeetings}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {meetingsData.events.map((event) => (
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
        ))}
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
          Refresh
        </button>
      </div>
    </div>
  )
}