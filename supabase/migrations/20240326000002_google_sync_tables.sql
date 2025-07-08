-- Create table for storing Google tokens
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create table for storing Google webhook notifications
CREATE TABLE IF NOT EXISTS google_webhook_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id TEXT NOT NULL,
  expiration TIMESTAMP WITH TIME ZONE,
  channel_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for storing calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_event_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  attendees TEXT,
  organizer_name TEXT,
  organizer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(google_event_id, user_id)
);

-- Create table for storing emails
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  sender_name TEXT,
  sender_email TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Enable row level security
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_webhook_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own Google tokens"
  ON user_google_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google tokens"
  ON user_google_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own calendar events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own emails"
  ON emails FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime subscriptions for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE emails;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at); 