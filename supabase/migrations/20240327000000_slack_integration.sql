-- Create Slack channels table
CREATE TABLE IF NOT EXISTS slack_channels (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  channel_name text NOT NULL,
  is_private boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

-- Create Slack messages table
CREATE TABLE IF NOT EXISTS slack_messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  slack_message_id text NOT NULL,
  user_slack_id text,
  text text,
  timestamp timestamptz NOT NULL,
  thread_ts text,
  is_bot boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(slack_message_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_slack_channels_user_id ON slack_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_slack_messages_user_id ON slack_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_slack_messages_channel_id ON slack_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_slack_messages_timestamp ON slack_messages(timestamp);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_slack_channels_updated_at
  BEFORE UPDATE ON slack_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slack_messages_updated_at
  BEFORE UPDATE ON slack_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE slack_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own slack channels"
  ON slack_channels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own slack channels"
  ON slack_channels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own slack channels"
  ON slack_channels FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own slack channels"
  ON slack_channels FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own slack messages"
  ON slack_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own slack messages"
  ON slack_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own slack messages"
  ON slack_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own slack messages"
  ON slack_messages FOR DELETE
  USING (auth.uid() = user_id); 