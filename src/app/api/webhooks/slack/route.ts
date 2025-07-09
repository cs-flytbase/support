import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'

// Verify Slack request signature
function verifySlackRequest(
  signingSecret: string,
  requestSignature: string,
  requestTimestamp: string,
  rawBody: string
): boolean {
  const baseString = `v0:${requestTimestamp}:${rawBody}`
  const hmac = crypto.createHmac('sha256', signingSecret)
  const signature = `v0=${hmac.update(baseString).digest('hex')}`
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(requestSignature))
}

export async function POST(request: Request) {
  try {
    const headersList = await headers()
    const slackSignature = headersList.get('x-slack-signature') || ''
    const slackTimestamp = headersList.get('x-slack-request-timestamp') || ''
    const rawBody = await request.text()

    if (!slackSignature || !slackTimestamp || !process.env.SLACK_SIGNING_SECRET) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Verify the request is from Slack
    const isValid = verifySlackRequest(
      process.env.SLACK_SIGNING_SECRET,
      slackSignature,
      slackTimestamp,
      rawBody
    )

    if (!isValid) {
      return new NextResponse('Invalid signature', { status: 401 })
    }

    const body = JSON.parse(rawBody)

    // Handle URL verification challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge })
    }

    // Handle other event types
    if (body.type === 'event_callback') {
      const event = body.event

      // Handle different event types
      switch (event.type) {
        case 'message':
          // Handle message events
          console.log('Received message event:', event)
          break
        case 'channel_created':
          // Handle channel creation events
          console.log('Channel created:', event)
          break
        // Add more event handlers as needed
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Error handling Slack webhook:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 