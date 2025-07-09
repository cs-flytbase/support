-- Create sync metadata table
CREATE TABLE IF NOT EXISTS sync_metadata (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  last_sync TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  sync_status TEXT NOT NULL CHECK (sync_status IN ('success', 'failed', 'in_progress')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_sync_metadata_user_id ON sync_metadata(user_id);
CREATE INDEX idx_sync_metadata_last_sync ON sync_metadata(last_sync);

-- Add RLS policies
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync metadata"
  ON sync_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync metadata"
  ON sync_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync metadata"
  ON sync_metadata FOR UPDATE
  USING (auth.uid() = user_id); 