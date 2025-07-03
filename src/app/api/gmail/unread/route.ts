// app/api/gmail/unread/route.ts
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get Google OAuth token from Clerk
    const clerk = await clerkClient()
    const oauthResponse = await clerk.users.getUserOauthAccessToken(
      userId,
      'oauth_google'
    )

    // In Clerk v5, getUserOauthAccessToken returns { data, totalCount }
    const oauthTokens = oauthResponse.data
    if (!oauthTokens || oauthTokens.length === 0) {
      return NextResponse.json({ 
        error: 'Google OAuth token not found. Please reconnect your Google account.',
        messages: [],
        totalUnread: 0
      })
    }

    const oauthAccessToken = oauthTokens[0]
    
    if (!oauthAccessToken?.token) {
      return NextResponse.json({ 
        error: 'Google OAuth token not found. Please reconnect your Google account.',
        messages: [],
        totalUnread: 0
      })
    }

    // Create Google Auth client
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: oauthAccessToken.token
    })

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Get unread messages from inbox
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox',
      maxResults: 10 // Limit to most recent 10 unread emails
    })

    const messageIds = listResponse.data.messages || []
    const totalUnread = listResponse.data.resultSizeEstimate || 0

    if (messageIds.length === 0) {
      return NextResponse.json({
        messages: [],
        totalUnread: 0
      })
    }

    // Fetch details for each message
    const messagePromises = messageIds.map(async (msg) => {
      try {
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        })
        return messageResponse.data
      } catch (error) {
        console.error(`Error fetching message ${msg.id}:`, error)
        return null
      }
    })

    const messages = await Promise.all(messagePromises)
    const validMessages = messages.filter(msg => msg !== null)

    // Format messages for frontend
    const formattedMessages = validMessages.map(message => {
      const headers = message.payload?.headers || []
      
      return {
        id: message.id,
        threadId: message.threadId,
        labelIds: message.labelIds || [],
        snippet: message.snippet || '',
        payload: {
          headers: headers,
          body: message.payload?.body
        },
        internalDate: message.internalDate || '0'
      }
    })

    return NextResponse.json({
      messages: formattedMessages,
      totalUnread: totalUnread
    })

  } catch (error: any) {
    console.error('Error fetching Gmail messages:', error)
    
    // Handle specific Google API errors
    if (error.code === 401) {
      return NextResponse.json({ 
        error: 'Google authentication expired. Please reconnect your account.',
        messages: [],
        totalUnread: 0
      }, { status: 401 })
    }
    
    if (error.code === 403) {
      return NextResponse.json({ 
        error: 'Gmail access denied. Please check your Gmail permissions.',
        messages: [],
        totalUnread: 0
      }, { status: 403 })
    }

    return NextResponse.json({ 
      error: 'Failed to fetch Gmail messages',
      messages: [],
      totalUnread: 0
    }, { status: 500 })
  }
}