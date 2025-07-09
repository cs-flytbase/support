import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { HubSpotSyncService } from '@/lib/services/hubspot-sync'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { testType, objectType = 'companies', limit = 3 } = body

    const hubspotSync = new HubSpotSyncService()
    const results: any = {}

    switch (testType) {
      case 'api_connection':
        results.connection = await testAPIConnection(hubspotSync)
        break
        
      case 'fetch_raw_data':
        results.rawData = await testFetchRawData(hubspotSync, objectType, limit)
        break
        
      case 'parse_data':
        results.parsedData = await testDataParsing(hubspotSync, objectType, limit)
        break
        
      case 'database_insert':
        results.databaseTest = await testDatabaseInsert(hubspotSync, objectType, limit)
        break
        
      case 'rate_limiting':
        results.rateLimiting = await testRateLimiting(hubspotSync)
        break
        
      case 'error_handling':
        results.errorHandling = await testErrorHandling(hubspotSync)
        break
        
      default:
        return NextResponse.json({ error: 'Invalid test type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      testType,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('HubSpot test error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function testAPIConnection(hubspotSync: HubSpotSyncService) {
  const startTime = Date.now()
  try {
    const result = await hubspotSync.testConnection()
    return {
      ...result,
      duration: Date.now() - startTime
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }
  }
}

async function testFetchRawData(hubspotSync: HubSpotSyncService, objectType: string, limit: number) {
  const startTime = Date.now()
  const results: any = {
    objectType,
    limit,
    duration: 0,
    success: false,
    data: null,
    error: null
  }

  try {
    // Access the private method via any type for testing
    const service = hubspotSync as any
    
    const properties = getPropertiesForObjectType(objectType)
    const endpoint = getEndpointForObjectType(objectType)
    
    const data = await service.fetchAllPaginated(endpoint, properties, limit)
    
    results.success = true
    results.data = {
      count: data.length,
      sample: data.slice(0, 2), // Show first 2 items
      properties: properties
    }
    
  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error'
  }
  
  results.duration = Date.now() - startTime
  return results
}

async function testDataParsing(hubspotSync: HubSpotSyncService, objectType: string, limit: number) {
  const startTime = Date.now()
  const results: any = {
    objectType,
    duration: 0,
    success: false,
    parsing: null,
    error: null
  }

  try {
    // Test actual sync with very small limit to see parsing
    let syncResult
    switch (objectType) {
      case 'companies':
        syncResult = await hubspotSync.syncCompanies(Math.min(limit, 2))
        break
      case 'contacts':
        syncResult = await hubspotSync.syncContacts(Math.min(limit, 2))
        break
      case 'deals':
        syncResult = await hubspotSync.syncDeals(Math.min(limit, 2))
        break
      default:
        throw new Error(`Unsupported object type: ${objectType}`)
    }
    
    results.success = true
    results.parsing = {
      syncedCount: syncResult,
      objectType
    }
    
  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error'
  }
  
  results.duration = Date.now() - startTime
  return results
}

async function testDatabaseInsert(hubspotSync: HubSpotSyncService, objectType: string, limit: number) {
  const startTime = Date.now()
  const results: any = {
    duration: 0,
    success: false,
    beforeCount: 0,
    afterCount: 0,
    inserted: 0,
    error: null
  }

  try {
    // Get count before
    const statsBefore = await hubspotSync.getStats()
    results.beforeCount = statsBefore[objectType] || 0
    
    // Try to sync 1-2 items
    let syncResult
    switch (objectType) {
      case 'companies':
        syncResult = await hubspotSync.syncCompanies(1)
        break
      case 'contacts':
        syncResult = await hubspotSync.syncContacts(1)
        break
      case 'deals':
        syncResult = await hubspotSync.syncDeals(1)
        break
      default:
        throw new Error(`Unsupported object type: ${objectType}`)
    }
    
    // Get count after
    const statsAfter = await hubspotSync.getStats()
    results.afterCount = statsAfter[objectType] || 0
    results.inserted = results.afterCount - results.beforeCount
    results.success = true
    
  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error'
  }
  
  results.duration = Date.now() - startTime
  return results
}

async function testRateLimiting(hubspotSync: HubSpotSyncService) {
  const startTime = Date.now()
  const results: any = {
    duration: 0,
    success: false,
    requests: [],
    error: null
  }

  try {
    // Make several rapid requests to test rate limiting
    const promises = []
    for (let i = 0; i < 5; i++) {
      promises.push(
        hubspotSync.testConnection().then((result: { success: boolean; error?: string }) => ({
          request: i + 1,
          ...result,
          timestamp: Date.now()
        }))
      )
    }
    
    const requestResults = await Promise.all(promises)
    results.requests = requestResults
    results.success = true
    
  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error'
  }
  
  results.duration = Date.now() - startTime
  return results
}

async function testErrorHandling(hubspotSync: HubSpotSyncService) {
  const startTime = Date.now()
  const results: any = {
    duration: 0,
    tests: {},
    error: null
  }

  try {
    // Test with invalid endpoint
    const service = hubspotSync as any
    
    try {
      await service.makeRequest('/invalid/endpoint')
      results.tests.invalidEndpoint = { success: false, error: 'Should have failed' }
    } catch (error) {
      results.tests.invalidEndpoint = { 
        success: true, 
        error: error instanceof Error ? error.message : 'Unknown error',
        expectedError: true
      }
    }
    
    // Test connection with current credentials
    const connectionTest = await hubspotSync.testConnection()
    results.tests.validConnection = connectionTest
    
  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error'
  }
  
  results.duration = Date.now() - startTime
  return results
}

function getPropertiesForObjectType(objectType: string): string[] {
  switch (objectType) {
    case 'companies':
      return ['name', 'domain', 'website', 'industry', 'annualrevenue', 'numberofemployees']
    case 'contacts':
      return ['firstname', 'lastname', 'email', 'phone', 'jobtitle', 'company']
    case 'deals':
      return ['dealname', 'dealstage', 'amount', 'closedate', 'pipeline']
    default:
      return ['name']
  }
}

function getEndpointForObjectType(objectType: string): string {
  return `/crm/v3/objects/${objectType}`
}

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      availableTests: [
        'api_connection - Test basic HubSpot API connectivity',
        'fetch_raw_data - Test fetching raw data from HubSpot',
        'parse_data - Test data parsing and transformation',
        'database_insert - Test database insertion',
        'rate_limiting - Test rate limiting behavior',
        'error_handling - Test error handling'
      ],
      usage: {
        method: 'POST',
        body: {
          testType: 'string (required)',
          objectType: 'string (optional, default: companies)',
          limit: 'number (optional, default: 3)'
        }
      }
    })

  } catch (error) {
    console.error('Test GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get test info' },
      { status: 500 }
    )
  }
} 