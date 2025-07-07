# HubSpot Integration Setup Guide

This guide will help you set up the complete HubSpot integration with your Next.js application.

## 🚀 Features

- **Complete Data Sync**: Companies, Contacts, and Deals from HubSpot to Supabase
- **Deal Engagement Tracking**: Sync emails, notes, calls, meetings, and tasks for deals you own
- **User-Specific Access**: Users can only access deals they own in HubSpot
- **Real-time Updates**: Real-time UI updates using Supabase Realtime
- **Vector Search**: Semantic search capabilities for engagement content
- **Dashboard UI**: Beautiful dashboard for managing syncs and viewing data

## 📋 Prerequisites

1. **HubSpot Account** with API access
2. **Supabase Project** (already configured)
3. **Next.js Application** (already set up)
4. **Clerk Authentication** (already configured)

## 🔧 Setup Steps

### 1. HubSpot API Configuration

#### Create a Private App in HubSpot:

1. Go to your [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Navigate to **Apps** → **Private Apps**
3. Click **Create a private app**
4. Give it a name like "Support App Integration"

#### Configure Scopes:

Add these scopes to your private app:

**CRM Scopes:**
- `crm.objects.companies.read`
- `crm.objects.contacts.read`
- `crm.objects.deals.read`
- `crm.objects.companies.write` (optional, for future updates)
- `crm.objects.contacts.write` (optional, for future updates)
- `crm.objects.deals.write` (optional, for future updates)

**Engagement Scopes:**
- `crm.objects.contacts.read`
- `crm.objects.companies.read`
- `crm.objects.deals.read`
- `crm.schemas.contacts.read`
- `crm.schemas.companies.read`
- `crm.schemas.deals.read`

**Association Scopes:**
- `crm.associations.read`

5. Click **Create app** and copy the **Access Token**

### 2. Environment Variables

Add this to your `.env` file:

```bash
# HubSpot Integration
HUBSPOT_API_KEY=pat-na1-your-hubspot-access-token-here
```

### 3. Database Migration

Run the HubSpot database migration:

```bash
# Apply the migration to add HubSpot tables and columns
npx supabase db push
```

Or apply manually via Supabase Dashboard:
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and run the migration from `supabase/migrations/20241225_hubspot_integration.sql`

### 4. User Mapping (Important!)

You need to map your Clerk users to HubSpot owners. There are two approaches:

#### Option A: Manual Mapping (Recommended for start)

1. Find your HubSpot User ID:
   - Go to HubSpot → Settings → Users & Teams
   - Find your user and note the ID in the URL or contact your HubSpot admin

2. Update your user record in Supabase:
   ```sql
   UPDATE users 
   SET hubspot_owner_id = 'your-hubspot-user-id-here'
   WHERE clerk_id = 'your-clerk-user-id';
   ```

#### Option B: Automatic Mapping (Advanced)

Create a mapping based on email addresses:
```sql
-- This assumes email addresses match between Clerk and HubSpot
UPDATE users 
SET hubspot_owner_id = (
  SELECT hubspot_owner_id 
  FROM hubspot_owners 
  WHERE email = users.email
)
WHERE hubspot_owner_id IS NULL;
```

### 5. Navigation Setup

Add HubSpot to your navigation. Update `src/components/app-sidebar.tsx`:

```typescript
const items = [
  // ... existing items
  {
    title: "HubSpot",
    url: "/hubspot",
    icon: Building2,
  },
  // ... other items
]
```

### 6. Initial Data Sync

#### Option A: Via Dashboard (Recommended)

1. Navigate to `/hubspot` in your application
2. Click **"Sync All Data"** button
3. Wait for the sync to complete

#### Option B: Via API

```bash
# Sync all data (companies, contacts, deals)
curl -X POST http://localhost:3000/api/hubspot/sync \
  -H "Content-Type: application/json" \
  -d '{
    "syncCompanies": true,
    "syncContacts": true,
    "syncDeals": true
  }'

# Sync with limits (for testing)
curl -X POST http://localhost:3000/api/hubspot/sync \
  -H "Content-Type: application/json" \
  -d '{
    "syncCompanies": true,
    "syncContacts": true,
    "syncDeals": true,
    "companiesLimit": 50,
    "contactsLimit": 100,
    "dealsLimit": 25
  }'
```

## 📊 Usage

### Dashboard Features

1. **Stats Overview**: See total counts of synced data
2. **My Deals**: View deals you own in HubSpot
3. **Deal Engagements**: Sync and view emails, notes, calls, meetings for your deals

### Syncing Deal Engagements

1. Go to the **HubSpot** page
2. Click on **"My Deals"** tab
3. Find a deal you want to sync engagements for
4. Click **"Sync Engagements"** button
5. View synced engagements in the **"Deal Engagements"** tab

### API Endpoints

- `GET /api/hubspot/sync` - Get sync statistics
- `POST /api/hubspot/sync` - Sync all HubSpot data
- `GET /api/hubspot/deals` - Get user's deals
- `POST /api/hubspot/deals/[dealId]/engagements` - Sync deal engagements
- `GET /api/hubspot/deals/[dealId]/engagements` - Get deal engagements

## 🔍 Troubleshooting

### Common Issues

#### 1. "No deals found"
**Cause**: User not mapped to HubSpot owner or no deals owned
**Solution**: 
- Verify `hubspot_owner_id` is set in users table
- Check that you own deals in HubSpot

#### 2. "HubSpot API error: 401"
**Cause**: Invalid or expired API key
**Solution**: 
- Verify `HUBSPOT_API_KEY` in `.env`
- Check scopes in HubSpot private app

#### 3. "Failed to sync engagements"
**Cause**: Deal doesn't exist or no permissions
**Solution**: 
- Verify deal exists in HubSpot
- Check that you own the deal

#### 4. Database connection errors
**Cause**: Missing Supabase configuration
**Solution**: 
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check database connection

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=DEBUG
```

### Test HubSpot Connection

```bash
# Test API connection
curl -H "Authorization: Bearer your-hubspot-api-key" \
  "https://api.hubapi.com/crm/v3/objects/companies?limit=1"
```

## 📈 Performance Optimization

### Batch Syncing

For large datasets, use limits:

```javascript
// Sync in batches
await fetch('/api/hubspot/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    companiesLimit: 1000,
    contactsLimit: 2000,
    dealsLimit: 500
  })
})
```

### Rate Limiting

The integration includes automatic rate limiting:
- 100ms delay between requests
- Automatic retry with exponential backoff
- Respect for HubSpot rate limits

## 🔄 Ongoing Sync

### Manual Sync
- Use the dashboard **"Sync All Data"** button
- Sync individual deal engagements as needed

### Automated Sync (Optional)
Set up a cron job to sync regularly:

```typescript
// src/app/api/cron/hubspot-sync/route.ts
export async function GET() {
  const sync = new HubSpotSyncService()
  await sync.syncDeals() // Sync new deals daily
  return NextResponse.json({ success: true })
}
```

## 🛡️ Security

### Row Level Security (RLS)

The integration includes automatic RLS policies:
- Users can only see engagements for deals they own
- All operations are user-scoped
- Secure API endpoints with Clerk authentication

### Data Privacy

- All HubSpot data is stored securely in Supabase
- Raw HubSpot data is preserved in JSONB fields
- User access is restricted by deal ownership

## 📚 API Reference

### HubSpotSyncService Methods

```typescript
// Sync all companies
await hubspotSync.syncCompanies(limit?: number)

// Sync all contacts  
await hubspotSync.syncContacts(limit?: number)

// Sync all deals
await hubspotSync.syncDeals(limit?: number)

// Sync engagements for a specific deal
await hubspotSync.syncDealEngagements(dealId: string, userId: string)

// Link associations between objects
await hubspotSync.linkAssociations()

// Test HubSpot API connection
await hubspotSync.testConnection()

// Get sync statistics
await hubspotSync.getStats()

// Get user's deals
await hubspotSync.getUserDeals(userId: string)
```

## ✅ Verification

After setup, verify everything works:

1. **Dashboard Access**: Navigate to `/hubspot` 
2. **Data Sync**: Click "Sync All Data" and verify counts
3. **User Deals**: Check "My Deals" tab shows your deals
4. **Engagements**: Sync and view engagements for a deal
5. **Real-time**: Verify UI updates automatically

## 🎯 Next Steps

1. **Custom Fields**: Extend sync to include custom HubSpot properties
2. **Webhooks**: Set up HubSpot webhooks for real-time sync
3. **Two-way Sync**: Enable writing data back to HubSpot
4. **Advanced Search**: Implement vector search for engagements
5. **Analytics**: Add engagement analytics and insights

## 🤝 Support

If you encounter issues:

1. Check the browser console for errors
2. Review server logs for API errors  
3. Verify HubSpot API permissions
4. Test database connections
5. Check user mapping configuration

The integration is now ready to use! 🎉 