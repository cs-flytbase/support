# 🚀 Complete Gmail & Calendar Sync Setup Guide

## 📦 1. Install Dependencies

```bash
npm install googleapis openai @supabase/supabase-js
npm install @clerk/nextjs @clerk/clerk-sdk-node
npm install -D @types/node
```

## 🔧 2. Environment Variables

Create or update your `.env.local`:

```env
# Supabase (you already have these)
NEXT_PUBLIC_SUPABASE_URL=https://qjvyjnepemhekqnbfmzm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk (you already have these)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# OpenAI for embeddings
OPENAI_API_KEY=your_openai_api_key

# Security tokens
CRON_SECRET=your_random_cron_secret_key_here
INTERNAL_API_TOKEN=your_internal_api_token_here
```

## 📁 3. File Structure

Your sync system now includes these files:

```
app/
├── api/
│   ├── sync/
│   │   ├── route.ts (✅ FIXED - was /api/sync/all)
│   │   ├── embeddings/
│   │   │   └── route.ts (✨ NEW)
│   │   └── gmail/
│   │       └── route.ts
│   ├── webhooks/
│   │   └── gmail/
│   │       └── route.ts (✨ NEW)
│   └── cron/
│       ├── sync-incremental/
│       │   └── route.ts (✨ NEW)
│       ├── process-embeddings/
│       │   └── route.ts (✨ NEW)
│       └── cleanup-queue/
│           └── route.ts (✨ NEW)
└── dashboard/
    └── components/
        └── SyncDashboard.tsx (✅ ENHANCED)

lib/
└── services/
    ├── gmail-sync.ts (✅ ENHANCED)
    ├── calendar-sync.ts (✅ ENHANCED)
    ├── embedding-service.ts (✨ NEW)
    ├── google-auth.ts
    └── sync-helpers.ts (✅ ENHANCED)

vercel.json (✨ NEW - Cron jobs)
```

## ⚙️ 4. Database Requirements

Make sure these tables exist in your Supabase database:

### Required Tables:
- ✅ `users` (existing)
- ✅ `user_integrations` (existing)
- ✅ `email` (existing)
- ✅ `calendar_events` (existing)
- ⚠️ `embedding_queue` (NEW - see SQL below)

### Create Embedding Queue Table:

```sql
-- Create embedding queue table
CREATE TABLE embedding_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('email', 'calendar_event')),
  item_id VARCHAR(255) NOT NULL,
  embedding_text TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_embedding_queue_status ON embedding_queue(status);
CREATE INDEX idx_embedding_queue_created_at ON embedding_queue(created_at);
CREATE INDEX idx_embedding_queue_item_type ON embedding_queue(item_type);

-- Create RPC functions for similarity search (if not exists)
CREATE OR REPLACE FUNCTION search_similar_emails(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  subject text,
  content text,
  sender_email text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    email.id,
    email.subject,
    email.content,
    email.sender_email,
    1 - (email.embedding <=> query_embedding) AS similarity
  FROM email
  WHERE email.embedding IS NOT NULL
    AND 1 - (email.embedding <=> query_embedding) > match_threshold
  ORDER BY email.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_similar_calendar_events(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  summary text,
  description text,
  start_time timestamp with time zone,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    calendar_events.id,
    calendar_events.summary,
    calendar_events.description,
    calendar_events.start_time,
    1 - (calendar_events.embedding <=> query_embedding) AS similarity
  FROM calendar_events
  WHERE calendar_events.embedding IS NOT NULL
    AND 1 - (calendar_events.embedding <=> query_embedding) > match_threshold
  ORDER BY calendar_events.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## 🔑 5. API Keys Setup

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add credits to your account ($10+ recommended)
4. Add to `.env.local` as `OPENAI_API_KEY`

### Cron Secret (Security)
Generate a random string for cron job authentication:
```bash
# Generate random secret
openssl rand -base64 32
```
Add to `.env.local` as `CRON_SECRET`

### Internal API Token
Generate another random string:
```bash
openssl rand -base64 32
```
Add to `.env.local` as `INTERNAL_API_TOKEN`

## 🚀 6. Testing Your Setup

### 1. Test Manual Sync
Visit your dashboard at `/dashboard` and click "Full Sync" to test the sync.

### 2. Test Individual Components
```bash
# Test Gmail sync
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"services": ["gmail"], "syncType": "incremental"}'

# Test Calendar sync  
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"services": ["calendar"], "syncType": "incremental"}'

# Test embedding processing
curl -X POST http://localhost:3000/api/sync/embeddings \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5}'

# Check embedding queue stats
curl http://localhost:3000/api/sync/embeddings
```

### 3. Check Database
Verify data is being inserted:
```sql
-- Check emails
SELECT COUNT(*) FROM email;
SELECT sender_email, subject, embedding_text FROM email LIMIT 5;

-- Check calendar events
SELECT COUNT(*) FROM calendar_events;
SELECT summary, start_time, embedding_text FROM calendar_events LIMIT 5;

-- Check embedding queue
SELECT status, COUNT(*) FROM embedding_queue GROUP BY status;
SELECT * FROM embedding_queue ORDER BY created_at DESC LIMIT 10;
```

## 📊 7. Monitoring

### Sync Dashboard Features:
- ✅ Gmail sync status and message counts
- ✅ Calendar sync status and event counts
- ✨ **NEW**: Embedding queue statistics
- ✨ **NEW**: Manual embedding processing button
- ✨ **NEW**: Real-time queue monitoring

### View Dashboard:
- Go to `/dashboard` in your app
- Check sync status and embedding queue
- Trigger manual syncs and embedding processing

## 🔄 8. Automation Schedule

Your system will automatically:
- **Every 30 minutes**: Incremental sync for all users (`/api/cron/sync-incremental`)
- **Every 15 minutes**: Process embedding queue (`/api/cron/process-embeddings`)
- **Daily at 2 AM**: Clean up old queue items (`/api/cron/cleanup-queue`)

### Vercel Cron Jobs:
The `vercel.json` file configures these automatic schedules when deployed.

## 🔗 9. Webhook Setup (Optional)

### Gmail Webhook Endpoint:
- **URL**: `https://your-domain.com/api/webhooks/gmail`
- **Method**: POST
- **Security**: Requires `INTERNAL_API_TOKEN`

### Example Webhook Call:
```bash
curl -X POST https://your-domain.com/api/webhooks/gmail \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_clerk_id_here",
    "internalToken": "your_internal_api_token",
    "message": "New email received"
  }'
```

## 🛠️ 10. How It Works

### Sync Flow:
1. **Gmail/Calendar Sync** → Fetches new emails/events
2. **Data Storage** → Saves to database with `embedding_text`
3. **Queue Creation** → Adds items to `embedding_queue`
4. **Embedding Processing** → Generates AI embeddings via OpenAI
5. **Vector Storage** → Updates records with embedding vectors
6. **AI Search Ready** → Content is searchable via semantic similarity

### Customer Linking:
- Emails automatically link to customers by contact email or domain
- Calendar events link by attendee emails
- Relationships are established for better context

### Embedding Benefits:
- **Semantic Search**: Find similar emails/meetings by meaning
- **AI Context**: Rich context for AI chat features
- **Content Discovery**: Surface relevant past interactions

## 🚨 11. Troubleshooting

### Common Issues:

1. **"Sync endpoint not found"** ✅ FIXED
   - Was trying to call `/api/sync/all`
   - Now correctly calls `/api/sync`

2. **"OAuth token not found"**
   - User needs to reconnect Gmail/Calendar in Clerk
   - Check OAuth scopes in Clerk dashboard

3. **"Rate limit exceeded"**
   - Normal - the system has built-in retry logic
   - Reduce batch sizes if persistent

4. **"OpenAI credits exhausted"**
   - Add credits to OpenAI account
   - Embeddings cost ~$0.10 per 1M tokens

5. **Empty embedding queue**
   - Check if sync is actually creating new records
   - Verify `embedding_text` field is populated

### Debug Mode:
Add to your API routes for detailed logging:
```typescript
console.log('Debug info:', { userId, syncType, results })
```

## 🎯 12. Next Steps

After setup is complete:

1. **Test with real data**: Run initial sync with your Gmail/Calendar
2. **Monitor performance**: Check sync times and embedding generation
3. **Build AI features**: Use the embeddings for semantic search and insights
4. **Scale optimization**: Add indexes and optimize queries as data grows

## 💡 13. Usage Tips

### For Users:
- Initial sync may take 10-30 minutes depending on email volume
- Incremental syncs are much faster (1-5 minutes)
- Embeddings enable AI search across all your data
- Customer linking improves over time as you add more contacts

### For Development:
- Use manual triggers during development
- Monitor embedding queue to ensure processing
- Check Vercel logs for cron job execution
- Test webhook endpoints before going live

## 🔥 What's New in This Update:

✅ **FIXED**: Sync endpoint URL (`/api/sync` instead of `/api/sync/all`)
✨ **NEW**: Automatic embedding generation for all emails and calendar events
✨ **NEW**: Embedding queue system with status tracking
✨ **NEW**: Webhook endpoint for real-time email notifications
✨ **NEW**: Automated cron jobs for syncing and embedding processing
✨ **NEW**: Enhanced dashboard with embedding queue monitoring
✨ **NEW**: Customer linking for emails and calendar events
✨ **NEW**: AI-ready semantic search capabilities

Your Gmail and Calendar sync system is now fully automated with AI embeddings! 🎉

---

## 📞 What's Next?

After this sync is working, you mentioned wanting to:
1. **Connect emails/meetings to HubSpot deals** - We can build deal linking logic
2. **Start AI chats about emails/meetings** - We can create chat interfaces
3. **Create snippets and ideation boards** - We can build the snippet system
4. **Generate proposals/handbooks** - We can add document generation

Let me know which feature you'd like to tackle next! 