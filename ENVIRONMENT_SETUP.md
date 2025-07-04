# Environment Setup Guide

This guide will help you configure the required environment variables for the Support App.

## Required Environment Variables

### 1. Supabase Service Role Key

**Current Status:** ❌ Missing - This is causing the calendar meetings API to fail

**How to get it:**
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: `vlhkfhioidnjnqvahhml`
3. Go to **Settings** → **API**
4. Copy the **service_role** key (not the anon key)
5. Replace `your_service_role_key_here` in your `.env` file

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_actual_service_role_key_here
```

### 2. OpenAI API Key (for AI Embeddings)

**Current Status:** ❌ Missing - Required for the embedding system

**How to get it:**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to **API Keys**
3. Create a new API key
4. Replace `your_openai_api_key_here` in your `.env` file

```bash
OPENAI_API_KEY=sk-your_actual_openai_api_key_here
```

### 3. Internal API Token

**Current Status:** ❌ Missing - Required for webhook security

**How to set it:**
Generate a secure random token:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Replace `your_internal_api_token_here` with the generated token.

## Environment Variables Status

| Variable | Status | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Set | Clerk authentication |
| `CLERK_SECRET_KEY` | ✅ Set | Clerk authentication |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ **Missing** | **Required for server operations** |
| `OPENAI_API_KEY` | ❌ **Missing** | Required for AI embeddings |
| `CRON_SECRET` | ✅ Set | Cron job security |
| `INTERNAL_API_TOKEN` | ❌ **Missing** | Required for webhook security |

## Quick Fix for Calendar Meetings Error

The immediate error you're seeing is caused by the missing `SUPABASE_SERVICE_ROLE_KEY`. To fix this:

1. **Get your Supabase service role key** (see instructions above)
2. **Update your .env file:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
   ```
3. **Restart your development server:**
   ```bash
   npm run dev
   ```

## Security Notes

- **Never commit the `.env` file** to version control
- **Use different keys for development and production**
- **Rotate keys regularly** for security
- **The service role key has admin privileges** - handle with care

## Testing the Fix

After updating the environment variables, test the calendar meetings API:

```bash
curl -X GET http://localhost:3000/api/calendar/meetings \
  -H "Authorization: Bearer your_clerk_token"
```

The error should be resolved once the `SUPABASE_SERVICE_ROLE_KEY` is properly set. 