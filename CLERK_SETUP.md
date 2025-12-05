# Clerk Authentication Setup Guide

## Step 1: Create Clerk Account

1. Go to [https://clerk.com](https://clerk.com)
2. Sign up for a free account
3. Verify your email

## Step 2: Create Application

1. In Clerk dashboard, click "Create Application"
2. Fill in:
   - **Application name**: `Atova MVP` (or your preferred name)
   - **Authentication options**: Choose your preferred method(s)
     - **Email** (recommended for MVP)
     - **Username** (optional)
     - **Social providers** (Google, GitHub, etc. - optional)
3. Click "Create Application"

## Step 3: Configure Authentication Methods

### Email Authentication (Required)

1. In Clerk dashboard, go to **User & Authentication** → **Email, Phone, Username**
2. Enable **Email address**
3. Choose:
   - **Email verification**: Required (recommended) or Optional
   - **Password requirements**: Set minimum length (8+ recommended)

### Username (Optional - but recommended)

1. Enable **Username**
2. Set username requirements:
   - **Minimum length**: 3 (recommended)
   - **Allowed characters**: Letters, numbers, underscore, hyphen

### Social Providers (Skip for MVP)

We're using email + password only for MVP. You can add social providers later if needed.

## Step 4: Configure User Profile

1. Go to **User & Authentication** → **Profile**
2. Enable these fields (required for Atova):
   - **First name** ✅ (REQUIRED - used for user initial in center dot)
   - **Last name** ✅ (REQUIRED - we'll use it for display)
   - **Profile image** (optional - can skip for MVP)

## Step 5: Get API Keys

1. In Clerk dashboard, go to **API Keys**
2. Copy:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

⚠️ **Important**: Use test keys for development, live keys for production.

## Step 6: Configure Sign-in/Sign-up Pages (Optional)

1. Go to **User & Authentication** → **Email, Phone, Username**
2. Customize appearance if desired
3. For MVP, default Clerk UI is fine

## Step 7: Add Environment Variables

Add to your `.env.local` file:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## Step 8: Configure Allowed Origins (for Production)

When deploying:
1. Go to **Settings** → **Paths**
2. Add your production domain to allowed origins
3. Update environment variables with live keys

## Configuration Summary

For Atova MVP, configure Clerk with:

✅ **Authentication**: Email + Password + Username (optional but recommended)  
✅ **Profile Fields**: First name (required), Last name (required)  
✅ **Email Verification**: Required (recommended) or Optional

The code is already set up to use `user.firstName` for the center dot initial. If first name is not available, it falls back to the first letter of the email address.

