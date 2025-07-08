-- Enable realtime for meetings table if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;

-- Create function to handle meeting changes
CREATE OR REPLACE FUNCTION handle_meeting_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- For meetings table
  IF TG_TABLE_NAME = 'meetings' THEN
    -- For inserts and updates
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
      -- Update the updated_at timestamp
      NEW.updated_at = NOW();
      
      -- Notify about the change
      PERFORM pg_notify(
        'meeting_changes',
        json_build_object(
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'record', row_to_json(NEW),
          'old_record', CASE 
            WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
            ELSE NULL
          END
        )::text
      );
      
      RETURN NEW;
    -- For deletes
    ELSIF (TG_OP = 'DELETE') THEN
      PERFORM pg_notify(
        'meeting_changes',
        json_build_object(
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'old_record', row_to_json(OLD)
        )::text
      );
      
      RETURN OLD;
    END IF;
  
  -- For deal_engagements table
  ELSIF TG_TABLE_NAME = 'deal_engagements' THEN
    -- Only handle MEETING type engagements
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
      IF NEW.engagement_type = 'MEETING' THEN
        -- Update the updated_at timestamp
        NEW.updated_at = NOW();
        
        -- Notify about the change
        PERFORM pg_notify(
          'meeting_changes',
          json_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'record', row_to_json(NEW),
            'old_record', CASE 
              WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
              ELSE NULL
            END
          )::text
        );
      END IF;
      
      RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
      IF OLD.engagement_type = 'MEETING' THEN
        PERFORM pg_notify(
          'meeting_changes',
          json_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'old_record', row_to_json(OLD)
          )::text
        );
      END IF;
      
      RETURN OLD;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for meetings table
DROP TRIGGER IF EXISTS meetings_changes_trigger ON meetings;
CREATE TRIGGER meetings_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION handle_meeting_changes();

-- Create trigger for deal_engagements table
DROP TRIGGER IF EXISTS deal_engagements_meeting_changes_trigger ON deal_engagements;
CREATE TRIGGER deal_engagements_meeting_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON deal_engagements
  FOR EACH ROW
  EXECUTE FUNCTION handle_meeting_changes();

-- Add comment for documentation
COMMENT ON FUNCTION handle_meeting_changes IS 'Handles real-time notifications for changes to meetings and meeting-type deal engagements'; 