import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

// Initialize the Slack Web API client
const client = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function POST(request: Request) {
  try {
    const { operation, params } = await request.json();
    
    switch (operation) {
      case 'sendMessage':
        const result = await client.chat.postMessage({
          channel: params.channel,
          text: params.text,
        });
        return NextResponse.json(result);
      
      // Add other Slack operations as needed
      
      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Slack API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 