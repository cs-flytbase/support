import { getAuth } from '@clerk/nextjs/server'
import { WebClient } from '@slack/web-api'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await fetch(`https://api.clerk.com/v1/users/${userId}/oauth_access_tokens/oauth_slack`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const tokens = await response.json()
    if (!tokens || !tokens.length) {
      return NextResponse.json({ error: 'No Slack token found' }, { status: 404 })
    }

    const token = tokens[0]
    if (!token?.token) {
      return NextResponse.json({ error: 'Invalid Slack token' }, { status: 400 })
    }

    const client = new WebClient(token.token)
    const authTest = await client.auth.test()

    return NextResponse.json({ token: token.token, authTest })
  } catch (error) {
    console.error('Slack auth error:', error)
    return NextResponse.json({ error: 'Failed to authenticate with Slack' }, { status: 500 })
  }
} 