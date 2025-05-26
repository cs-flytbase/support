import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Forward the request to the webhook endpoint
    const response = await fetch('https://flytbasecs69.app.n8n.cloud/webhook/57e9905d-9cea-4ac0-a7e0-0a3f15b8e455', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Webhook responded with status: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error forwarding to webhook:', error);
    return NextResponse.json(
      { error: 'Failed to send message to webhook' },
      { status: 500 }
    );
  }
}
