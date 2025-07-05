-- Create an efficient RPC function to get embedding queue stats
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_embedding_queue_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pending', COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0),
    'processing', COALESCE(SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END), 0),
    'completed', COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
    'failed', COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0)
  ) INTO result
  FROM embedding_queue;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create an index on status column for faster queries (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON embedding_queue(status);

-- Also create a faster pure SQL version
CREATE OR REPLACE FUNCTION get_embedding_queue_stats_fast()
RETURNS TABLE(
  pending BIGINT,
  processing BIGINT,
  completed BIGINT,
  failed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
    COALESCE(SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END), 0) as processing,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
    COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed
  FROM embedding_queue;
END;
$$ LANGUAGE plpgsql;

-- Missing RPC function for fast embedding queue statistics
-- This fixes the "RPC function not available, falling back to manual count" issue

CREATE OR REPLACE FUNCTION get_embedding_queue_stats_fast()
RETURNS TABLE (
  pending BIGINT,
  processing BIGINT,
  completed BIGINT,
  failed BIGINT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'processing') as processing,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed
  FROM embedding_queue;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_embedding_queue_stats_fast() TO anon, authenticated;

-- Additional embedding queue table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.embedding_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('email', 'calendar_event')),
  item_id TEXT NOT NULL,
  embedding_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON public.embedding_queue(status);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_item_type ON public.embedding_queue(item_type);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_created_at ON public.embedding_queue(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.embedding_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for embedding queue access
CREATE POLICY "Users can access their own embedding queue items" ON public.embedding_queue
  FOR ALL USING (true); -- Adjust this based on your user model

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_embedding_queue_updated_at 
  BEFORE UPDATE ON public.embedding_queue 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 