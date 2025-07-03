// app/api/gmail/mark-read/route.ts
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { messageId } = await request.json()
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
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
        error: 'Google OAuth token not found' 
      }, { status: 401 })
    }

    const oauthAccessToken = oauthTokens[0]
    
    if (!oauthAccessToken?.token) {
      return NextResponse.json({ 
        error: 'Google OAuth token not found' 
      }, { status: 401 })
    }

    // Create Google Auth client
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: oauthAccessToken.token
    })

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Mark message as read by removing the UNREAD label
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD']
      }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error marking message as read:', error)
    
    if (error.code === 401) {
      return NextResponse.json({ 
        error: 'Authentication expired' 
      }, { status: 401 })
    }
    
    if (error.code === 404) {
      return NextResponse.json({ 
        error: 'Message not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      error: 'Failed to mark message as read' 
    }, { status: 500 })
  }
}