-- Initial schema for Atova MVP
-- This migration creates the people and events tables

-- Create people table
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  role text,
  company text,
  introducer_id uuid REFERENCES people(id) ON DELETE SET NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  description text NOT NULL,
  sentiment text NOT NULL CHECK (sentiment IN ('good', 'bad', 'neutral')),
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_people_introducer_id ON people(introducer_id);
CREATE INDEX IF NOT EXISTS idx_events_person_id ON events(person_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Note: RLS is disabled because we're using Clerk for authentication
-- All data access is filtered by user_id in the application layer
-- This is acceptable for MVP. For production, consider:
-- 1. Setting up Clerk webhook to sync users to Supabase Auth
-- 2. Using Supabase Edge Functions with service role key
-- 3. Implementing API routes that validate Clerk sessions

-- RLS is disabled - we filter by user_id in application code
-- ALTER TABLE people ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;

