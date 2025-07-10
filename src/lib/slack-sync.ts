export async function sendSlackMessage(channel: string, text: string) {
  try {
    const response = await fetch('/api/slack/operations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'sendMessage',
        params: {
          channel,
          text,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending Slack message:', error);
    throw error;
  }
}

// Add other Slack operations as needed 