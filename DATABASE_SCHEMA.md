# Database Schema for Atova MVP

This document describes the Supabase database schema required for the Atova MVP.

## Tables

### `people`
Stores information about connections/people in the user's network.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| `user_id` | text | NOT NULL | Clerk user ID (foreign key to Clerk users) |
| `name` | text | NOT NULL | Person's name |
| `role` | text | NULL | Person's role |
| `company` | text | NULL | Person's company |
| `introducer_id` | uuid | NULL, REFERENCES people(id) | ID of the person who introduced this person (self-reference) |
| `notes` | text | NULL | Optional notes about the person |
| `created_at` | timestamp | DEFAULT now() | Timestamp when record was created |

**Indexes:**
- Index on `user_id` for faster queries
- Index on `introducer_id` for relationship queries

### `events`
Stores interaction events/notes about people.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| `person_id` | uuid | NOT NULL, REFERENCES people(id) ON DELETE CASCADE | ID of the person this event is about |
| `description` | text | NOT NULL | Description of what happened |
| `sentiment` | text | NOT NULL, CHECK (sentiment IN ('good', 'bad', 'neutral')) | Sentiment of the event |
| `created_at` | timestamp | DEFAULT now() | Timestamp when event was created |

**Indexes:**
- Index on `person_id` for faster queries
- Index on `created_at` for chronological ordering

## Row Level Security (RLS)

Enable RLS on both tables and create policies:

### `people` table policies:
- Users can only SELECT, INSERT, UPDATE, DELETE their own people (where `user_id` = auth.uid() or matches Clerk user ID)

### `events` table policies:
- Users can only SELECT, INSERT, UPDATE, DELETE events for people they own (via JOIN with people table)

## SQL Setup Script

Run this in your Supabase SQL editor:

```sql
-- Create people table
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  name text NOT NULL,
  role text,
  company text,
  introducer_id uuid REFERENCES people(id) ON DELETE SET NULL,
  notes text,
  created_at timestamp DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  description text NOT NULL,
  sentiment text NOT NULL CHECK (sentiment IN ('good', 'bad', 'neutral')),
  created_at timestamp DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_people_introducer_id ON people(introducer_id);
CREATE INDEX IF NOT EXISTS idx_events_person_id ON events(person_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Enable RLS
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Note: You'll need to create RLS policies based on your authentication setup
-- Since we're using Clerk, you may need to use a custom function or webhook
-- to sync Clerk user IDs with Supabase auth, or use service role key for authenticated requests
```

## Notes

- **Authentication**: Since we're using Clerk for authentication, the `user_id` field stores the Clerk user ID as text. You may need to set up RLS policies that work with your authentication method, or use the Supabase service role key for authenticated requests from your Next.js API routes.

- **Self-referencing**: The `introducer_id` field creates a self-referential relationship in the `people` table, allowing people to be introduced by other people in the network.

- **Cascading deletes**: When a person is deleted, all their events are automatically deleted (CASCADE). When an introducer is deleted, the `introducer_id` is set to NULL (SET NULL).

