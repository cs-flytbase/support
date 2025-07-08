-- Enable realtime for calendar_events table
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;

-- Create function to handle meeting changes
CREATE OR REPLACE FUNCTION handle_meeting_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- For calendar_events table
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    
    -- For new meetings, ensure user_id is set
    IF TG_OP = 'INSERT' AND NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'user_id cannot be null';
    END IF;
  END IF;

  -- Return the appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for calendar_events
DROP TRIGGER IF EXISTS calendar_events_changes_trigger ON calendar_events;
CREATE TRIGGER calendar_events_changes_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION handle_meeting_changes();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time); 