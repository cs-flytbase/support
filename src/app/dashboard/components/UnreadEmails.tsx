// components/UnreadEmails.tsx
'use client'
import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface EmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: Array<{
      name: string
      value: string
    }>
    body?: {
      data?: string
    }
  }
  internalDate: string
}

interface EmailsData {
  messages: EmailMessage[]
  totalUnread: number
  loading: boolean
  error?: string
}

export default function UnreadEmails() {
  const [emailsData, setEmailsData] = useState<EmailsData>({
    messages: [],
    totalUnread: 0,
    loading: true
  })

  useEffect(() => {
    fetchUnreadEmails()
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchUnreadEmails, 120000)
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadEmails = async () => {
    try {
      setEmailsData(prev => ({ ...prev, loading: true, error: undefined }))
      
      const response = await fetch('/api/gmail/unread')
      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }
      
      const data = await response.json()
      setEmailsData({
        messages: data.messages || [],
        totalUnread: data.totalUnread || 0,
        loading: false
      })
    } catch (error) {
      console.error('Error fetching emails:', error)
      setEmailsData({
        messages: [],
        totalUnread: 0,
        loading: false,
        error: 'Failed to load emails'
      })
    }
  }

  const getEmailHeader = (message: EmailMessage, headerName: string) => {
    const header = message.payload.headers.find(h => h.name.toLowerCase() === headerName.toLowerCase())
    return header?.value || ''
  }

  const getGmailUrl = (messageId: string) => {
    return `https://mail.google.com/mail/u/0/#inbox/${messageId}`
  }

  const markAsRead = async (messageId: string) => {
    try {
      await fetch('/api/gmail/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId })
      })
      
      // Remove from local state
      setEmailsData(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== messageId),
        totalUnread: Math.max(0, prev.totalUnread - 1)
      }))
    } catch (error) {
      console.error('Error marking email as read:', error)
    }
  }

  const getSenderName = (fromHeader: string) => {
    // Extract name from "Name <email@domain.com>" format
    const match = fromHeader.match(/^(.+?)\s*</)
    return match ? match[1].trim().replace(/"/g, '') : fromHeader.split('@')[0]
  }

  const formatEmailDate = (internalDate: string) => {
    const date = new Date(parseInt(internalDate))
    return formatDistanceToNow(date, { addSuffix: true })
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (emailsData.loading && emailsData.messages.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (emailsData.error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{emailsData.error}</p>
          <button 
            onClick={fetchUnreadEmails}
            className="mt-2 text-sm text-red-800 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (emailsData.messages.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No unread emails</p>
          <button 
            onClick={fetchUnreadEmails}
            className="mt-2 text-sm text-green-600 hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header with unread count */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {emailsData.totalUnread > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
              {emailsData.totalUnread}
            </span>
          )}
        </div>
        <button
          onClick={fetchUnreadEmails}
          disabled={emailsData.loading}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${emailsData.loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Email list */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {emailsData.messages.map((message) => {
          const from = getEmailHeader(message, 'from')
          const subject = getEmailHeader(message, 'subject')
          const senderName = getSenderName(from)
          
          return (
            <div 
              key={message.id} 
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 truncate">
                      {senderName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatEmailDate(message.internalDate)}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-medium text-gray-800 mb-1 truncate">
                    {subject || '(No Subject)'}
                  </h4>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {truncateText(message.snippet)}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <a
                    href={getGmailUrl(message.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-center"
                  >
                    Open
                  </a>
                  <button
                    onClick={() => markAsRead(message.id)}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Mark Read
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show more button if there are many emails */}
      {emailsData.totalUnread > emailsData.messages.length && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <a
            href="https://mail.google.com/mail/u/0/#inbox"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 hover:underline"
          >
            View all {emailsData.totalUnread} unread emails in Gmail
          </a>
        </div>
      )}
    </div>
  )
}