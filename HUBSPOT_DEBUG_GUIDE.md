# HubSpot Sync Debugging Guide

This guide helps you debug HubSpot database syncing issues using the comprehensive debugging tools we've built.

## 🚨 Problem: Sync Not Working Without Errors

When your HubSpot sync appears to run successfully but no data appears in your database, here's how to debug it systematically.

## 🛠️ Debugging Tools Available

### 1. Debug API Endpoint
**Endpoint:** `POST /api/hubspot/debug`

Provides step-by-step debugging of the sync process with detailed logging.

```bash
curl -X POST http://localhost:3000/api/hubspot/debug \
  -H "Content-Type: application/json" \
  -d '{
    "testConnection": true,
    "syncType": "companies",
    "limit": 5,
    "dryRun": false
  }'
```

### 2. Test API Endpoint
**Endpoint:** `POST /api/hubspot/test`

Tests individual components of the sync process.

```bash
curl -X POST http://localhost:3000/api/hubspot/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "api_connection",
    "objectType": "companies",
    "limit": 3
  }'
```

### 3. Single Company Debug Endpoint
**Endpoint:** `POST /api/hubspot/debug-single`

Tests syncing a single company with detailed error logging.

```bash
curl -X POST http://localhost:3000/api/hubspot/debug-single \
  -H "Content-Type: application/json"
```

### 4. Python Debug Script
**File:** `scripts/test_hubspot_debug.py`

Automated testing script that runs all debugging tests.

```bash
cd scripts
python test_hubspot_debug.py
```

## 🔍 Step-by-Step Debugging Process

### Step 1: Check Current State

```bash
curl -X GET http://localhost:3000/api/hubspot/debug
```

This will show you:
- Current database counts
- Environment configuration
- Available endpoints

### Step 2: Test API Connection

```bash
curl -X POST http://localhost:3000/api/hubspot/test \
  -H "Content-Type: application/json" \
  -d '{"testType": "api_connection"}'
```

**Look for:**
- ✅ `success: true` - API key is valid
- ❌ `success: false` - Check your `HUBSPOT_API_KEY` environment variable

### Step 3: Test Data Fetching

```bash
curl -X POST http://localhost:3000/api/hubspot/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "fetch_raw_data",
    "objectType": "companies",
    "limit": 2
  }'
```

**Look for:**
- Data count > 0
- Sample data structure
- Any fetch errors

### Step 4: Test Data Parsing

```bash
curl -X POST http://localhost:3000/api/hubspot/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "parse_data",
    "objectType": "companies",
    "limit": 1
  }'
```

**Look for:**
- Successful parsing
- Database insertion success
- Data transformation issues

### Step 5: Test Database Insertion

```bash
curl -X POST http://localhost:3000/api/hubspot/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "database_insert",
    "objectType": "companies",
    "limit": 1
  }'
```

**Look for:**
- Before/after counts
- Actual insertions vs duplicates
- Database connection issues

### Step 6: Debug Single Company (RECOMMENDED FIRST)

If you're seeing "[object Object]" errors, start here to get the actual error:

```bash
curl -X POST http://localhost:3000/api/hubspot/debug-single \
  -H "Content-Type: application/json"
```

This will sync just one company and show you exactly what's failing.

### Step 7: Run Full Debug

```bash
curl -X POST http://localhost:3000/api/hubspot/debug \
  -H "Content-Type: application/json" \
  -d '{
    "testConnection": true,
    "syncType": "companies",
    "limit": 5,
    "dryRun": false
  }'
```

## 🔧 Common Issues and Solutions

### Issue 0: "[object Object]" Error Messages
**Symptoms:** Logs show `Error importing company X: [object Object]`
**Solution:** This was a logging issue that has been FIXED. The actual error messages will now show properly. Run the debug again to see the real errors.

**Quick Fix:** Use the single company debug endpoint to see the exact error:
```bash
curl -X POST http://localhost:3000/api/hubspot/debug-single \
  -H "Content-Type: application/json"
```

### Issue 1: API Connection Fails
**Symptoms:** `connection_test` step fails
**Solutions:**
- Check `HUBSPOT_API_KEY` environment variable
- Verify API key has correct permissions
- Check network connectivity

### Issue 2: Data Fetched But Not Inserted
**Symptoms:** Fetch succeeds, database insertion fails
**Solutions:**
- Check database connection
- Verify table structure matches expected schema
- Look for unique constraint violations
- Check data type mismatches

### Issue 3: Data Fetched and "Inserted" But Not Visible
**Symptoms:** Sync reports success but database shows no new records
**Solutions:**
- Check for duplicate key violations (data already exists)
- Verify you're looking at the correct database/table
- Check if data is being inserted in transactions that aren't committed

### Issue 4: Silent Failures
**Symptoms:** No errors reported but no data synced
**Solutions:**
- Enable debug logging (`NODE_ENV=development`)
- Check application logs
- Run individual test components
- Verify sync filters aren't excluding all data

## 📊 Understanding Debug Output

### Debug Steps Status
- ✅ `success` - Step completed successfully
- ❌ `error` - Step failed with error
- ⚠️ `warning` - Step completed with warnings
- ⏳ `pending` - Step in progress

### Key Debug Steps to Watch
1. **auth** - User authentication
2. **service_init** - HubSpot service initialization
3. **connection_test** - API connectivity
4. **db_test** - Database connectivity
5. **db_state** - Current database state
6. **companies_fetch** - Data fetching from HubSpot
7. **companies_sync** - Data transformation and insertion
8. **companies_verify** - Database verification

## 🐛 Advanced Debugging

### Enable Detailed Logging
Set environment variable:
```bash
NODE_ENV=development
```

This enables detailed logging in the HubSpot sync service.

### Check Application Logs
```bash
# If using pm2
pm2 logs

# If running directly
# Check your application logs in the terminal
```

### Database Direct Inspection
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('companies', 'contacts', 'deals');

-- Check recent insertions
SELECT COUNT(*), MAX(hubspot_synced_at) 
FROM companies 
WHERE hubspot_synced_at IS NOT NULL;

-- Check for errors in data
SELECT hubspot_company_id, name, hubspot_raw_data 
FROM companies 
WHERE hubspot_synced_at > NOW() - INTERVAL '1 hour'
LIMIT 5;
```

### Test Different Object Types
```bash
# Test contacts
curl -X POST http://localhost:3000/api/hubspot/debug \
  -H "Content-Type: application/json" \
  -d '{"syncType": "contacts", "limit": 3, "dryRun": true}'

# Test deals
curl -X POST http://localhost:3000/api/hubspot/debug \
  -H "Content-Type: application/json" \
  -d '{"syncType": "deals", "limit": 3, "dryRun": true}'
```

## 📝 Debugging Checklist

- [ ] Environment variables are set correctly
- [ ] HubSpot API key is valid and has permissions
- [ ] Database connection is working
- [ ] Database tables exist and have correct schema
- [ ] No unique constraint violations
- [ ] Data transformation is working correctly
- [ ] No silent filtering excluding all data
- [ ] Application logs show detailed information
- [ ] Test with small data sets first

## 🚀 Quick Start Debugging

Run this single command to get a comprehensive overview:

```bash
python scripts/test_hubspot_debug.py
```

This will:
1. Check current state
2. Test all individual components
3. Run a dry-run sync
4. Optionally run a real sync test
5. Provide detailed output and next steps

## 🆘 Still Having Issues?

If you're still experiencing problems after following this guide:

1. **Check the debug output** for specific error messages
2. **Review application logs** for detailed error information
3. **Verify your HubSpot API permissions** in the HubSpot developer console
4. **Test with a minimal dataset** (limit: 1) to isolate issues
5. **Check database schema** matches the expected structure

## 📋 Environment Variables Checklist

Make sure these are set:
```bash
HUBSPOT_API_KEY=your_hubspot_api_key_here
DATABASE_URL=your_database_connection_string
NODE_ENV=development  # For detailed logging
``` 