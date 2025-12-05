# Supabase Setup Guide

Follow these steps to set up Supabase for the Atova MVP.

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name**: `atova-mvp` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine for MVP
5. Click "Create new project"
6. Wait 2-3 minutes for project to initialize

## Step 2: Install Supabase CLI (if not already installed)

```bash
# macOS
brew install supabase/tap/supabase

# Or using npm (already installed in this project)
npx supabase --version
```

## Step 3: Login to Supabase CLI

```bash
npx supabase login
```

This will open your browser to authenticate.

## Step 4: Link Your Local Project to Supabase

```bash
# From the project root directory
npx supabase link --project-ref YOUR_PROJECT_REF
```

To find your project ref:
1. Go to your Supabase dashboard
2. Click on your project
3. Go to Settings → General
4. Copy the "Reference ID" (looks like: `abcdefghijklmnop`)

## Step 5: Push Migrations to Database

```bash
# Push all migrations in supabase/migrations/
npx supabase db push
```

This will:
- Create the `people` and `events` tables
- Set up indexes for performance
- Note: RLS is disabled (we filter by user_id in application code since we use Clerk)

## Step 6: Get Your API Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")

## Step 7: Add Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 8: Verify Setup

Run the migration to verify everything works:

```bash
npx supabase db push
```

You should see:
```
Applying migration 20240101000000_initial_schema.sql...
Finished supabase/migrations/20240101000000_initial_schema.sql
```

## Troubleshooting

### If `supabase link` fails:
- Make sure you're logged in: `npx supabase login`
- Check your project ref is correct
- Try: `npx supabase link --project-ref YOUR_REF --password YOUR_DB_PASSWORD`

### If migrations fail:
- Check Supabase dashboard → Database → Migrations to see error details
- Verify your database password is correct
- Check the SQL editor in Supabase dashboard for detailed error messages

### If you need to reset:
```bash
# Reset local migrations (be careful - this will drop tables!)
npx supabase db reset
```

## Next Steps

After Supabase is set up, you'll need to:
1. Set up Clerk authentication (see CLERK_SETUP.md)
2. Add Clerk environment variables to `.env.local`
3. Start the dev server: `npm run dev`

