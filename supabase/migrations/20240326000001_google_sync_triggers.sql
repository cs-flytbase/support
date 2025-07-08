-- Create a table to store Google webhook notifications
CREATE TABLE IF NOT EXISTS google_webhook_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id TEXT NOT NULL,
  expiration TIMESTAMP WITH TIME ZONE,
  channel_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a function to process Google Calendar events
CREATE OR REPLACE FUNCTION process_google_calendar_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the updated_at timestamp
  NEW.updated_at = NOW();
  
  -- For new events
  IF TG_OP = 'INSERT' THEN
    -- Notify about new event
    PERFORM pg_notify(
      'calendar_events',
      json_build_object(
        'type', 'INSERT',
        'table', TG_TABLE_NAME,
        'record', row_to_json(NEW)
      )::text
    );
  
  -- For updated events
  ELSIF TG_OP = 'UPDATE' THEN
    -- Notify about updated event
    PERFORM pg_notify(
      'calendar_events',
      json_build_object(
        'type', 'UPDATE',
        'table', TG_TABLE_NAME,
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to process emails
CREATE OR REPLACE FUNCTION process_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the updated_at timestamp
  NEW.updated_at = NOW();
  
  -- Notify about new email
  PERFORM pg_notify(
    'emails',
    json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW)
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for calendar events
DROP TRIGGER IF EXISTS calendar_events_trigger ON calendar_events;
CREATE TRIGGER calendar_events_trigger
  AFTER INSERT OR UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION process_google_calendar_event();

-- Create trigger for emails
DROP TRIGGER IF EXISTS emails_trigger ON emails;
CREATE TRIGGER emails_trigger
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION process_email();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_webhook_notifications_user_id ON google_webhook_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_google_webhook_notifications_channel_id ON google_webhook_notifications(channel_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id); 