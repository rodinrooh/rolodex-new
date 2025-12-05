# Deployment Guide - map.atova.co

This guide walks you through deploying the Atova MVP to Vercel with the custom domain map.atova.co.

## Prerequisites

- GitHub account
- Vercel account (can sign up with GitHub)
- Domain: atova.co (you own this)
- Clerk account with production keys
- Supabase project with production database

## Step 1: Prepare GitHub Repository

### 1.1 Initialize Git (if not already done)
```bash
git init
git add .
git commit -m "Initial commit - ready for deployment"
```

### 1.2 Create GitHub Repository
1. Go to [github.com](https://github.com) and sign in
2. Click the "+" icon → "New repository"
3. Repository name: `rolodex` (or your preferred name)
4. Description: "Atova MVP - Network visualization tool"
5. Set to **Private** (recommended) or Public
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click "Create repository"

### 1.3 Connect Local Repository to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/rolodex.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 2: Set Up Vercel Deployment

### 2.1 Connect Repository to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in (use GitHub to sign in)
2. Click "Add New..." → "Project"
3. Import your GitHub repository (`rolodex`)
4. Vercel will auto-detect Next.js settings

### 2.2 Configure Build Settings
Vercel should auto-detect:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (or `next build`)
- **Output Directory**: `.next`
- **Install Command**: `npm install`

If not auto-detected, use these settings.

### 2.3 Add Environment Variables
In Vercel project settings → Environment Variables, add:

**Production Environment:**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

**Preview Environment:**
Use the same variables (or test keys if you prefer separate preview environment)

**Development Environment:**
Use test keys for local development

⚠️ **Important**: 
- Use **live/production** keys from Clerk for production deployment
- Use **production** Supabase URL and keys (not local dev database)

### 2.4 Deploy
1. Click "Deploy"
2. Wait for build to complete (usually 1-2 minutes)
3. You'll get a Vercel URL like: `rolodex-xyz.vercel.app`

## Step 3: Configure Custom Domain (map.atova.co)

### 3.1 Add Domain in Vercel
1. In your Vercel project, go to **Settings** → **Domains**
2. Enter: `map.atova.co`
3. Click "Add"
4. Vercel will show DNS configuration instructions

### 3.2 Configure DNS Records
You need to add a DNS record in your domain registrar (where you manage atova.co):

**Option A: CNAME Record (Recommended)**
- **Type**: CNAME
- **Name**: `map`
- **Value**: `cname.vercel-dns.com` (or the specific value Vercel provides)
- **TTL**: 3600 (or default)

**Option B: A Record**
- **Type**: A
- **Name**: `map`
- **Value**: Vercel's IP address (Vercel will provide this)
- **TTL**: 3600

### 3.3 Verify Domain
1. After adding DNS record, wait 5-60 minutes for DNS propagation
2. In Vercel, click "Refresh" in the Domains section
3. Once verified, Vercel will automatically provision SSL certificate
4. Your site will be live at https://map.atova.co

## Step 4: Configure Clerk for Production

### 4.1 Update Clerk Allowed Origins
1. Go to [clerk.com](https://clerk.com) dashboard
2. Select your application
3. Go to **Settings** → **Paths**
4. Add to **Allowed Origins**:
   - `https://map.atova.co`
   - `https://rolodex-xyz.vercel.app` (your Vercel URL, optional but recommended)

### 4.2 Switch to Production Keys
1. In Clerk dashboard, go to **API Keys**
2. Copy your **Live** keys (not test keys):
   - `pk_live_...` (Publishable Key)
   - `sk_live_...` (Secret Key)
3. Update Vercel environment variables with these live keys

### 4.3 Update Environment Variables in Vercel
1. Go to Vercel project → **Settings** → **Environment Variables**
2. Update:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → use `pk_live_...`
   - `CLERK_SECRET_KEY` → use `sk_live_...`
3. Click "Save"
4. **Redeploy** the project (Settings → Deployments → click "..." → Redeploy)

## Step 5: Verify Production Database

### 5.1 Ensure Supabase Production Database is Set Up
1. Go to [supabase.com](https://supabase.com) dashboard
2. Verify your production project has:
   - All migrations applied
   - Correct schema (people, events tables)
   - RLS policies configured (if using)

### 5.2 Use Production Supabase Keys
- Use production Supabase URL and anon key in Vercel environment variables
- These should be different from your local development keys

## Step 6: Test Deployment

### 6.1 Test the Site
1. Visit https://map.atova.co
2. Test sign-up flow
3. Test sign-in flow
4. Test creating people and events
5. Verify data persists (check Supabase dashboard)

### 6.2 Check for Issues
- Check Vercel deployment logs for errors
- Check browser console for client-side errors
- Verify environment variables are set correctly

## Troubleshooting

### DNS Not Resolving
- Wait up to 24-48 hours for DNS propagation (usually 5-60 minutes)
- Verify DNS record is correct in your domain registrar
- Use `dig map.atova.co` or `nslookup map.atova.co` to check DNS

### SSL Certificate Issues
- Vercel automatically provisions SSL certificates
- Wait 5-10 minutes after domain verification
- If issues persist, check Vercel dashboard → Domains for errors

### Environment Variables Not Working
- Ensure variables are set for "Production" environment
- Redeploy after adding/updating environment variables
- Check variable names match exactly (case-sensitive)

### Clerk Authentication Errors
- Verify Clerk allowed origins include `https://map.atova.co`
- Ensure you're using live keys (not test keys) in production
- Check Clerk dashboard for any errors

### Build Failures
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility (Vercel uses Node 18+ by default)

## Continuous Deployment

Once set up:
- Every push to `main` branch will automatically deploy to production
- Pull requests will create preview deployments
- You can configure branch protection in GitHub if needed

## Next Steps

After deployment:
- Set up monitoring (Vercel Analytics, Sentry, etc.)
- Configure custom error pages if needed
- Set up backup strategy for Supabase database
- Consider setting up staging environment

