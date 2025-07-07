import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { HubSpotSyncService } from '@/lib/services/hubspot-sync'
import { createClient } from '@/utils/supabase/server'

interface DebugStep {
  step: string
  status: 'pending' | 'success' | 'error' | 'warning'
  message: string
  data?: any
  timestamp: string
  duration?: number
}

export async function POST(request: NextRequest) {
  const debugSteps: DebugStep[] = []
  const startTime = new Date()

  const addStep = (step: string, status: DebugStep['status'], message: string, data?: any) => {
    debugSteps.push({
      step,
      status,
      message,
      data,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime.getTime()
    })
  }

  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    addStep('auth', 'success', `User authenticated: ${userId}`)

    const body = await request.json()
    const { 
      testConnection = true,
      syncType = 'companies', // companies, contacts, deals, associations
      limit = 5, // Small limit for debugging
      dryRun = false
    } = body

    addStep('config', 'success', 'Debug configuration loaded', { syncType, limit, dryRun })

    // Initialize HubSpot service
    let hubspotSync: HubSpotSyncService
    try {
      hubspotSync = new HubSpotSyncService()
      addStep('service_init', 'success', 'HubSpot service initialized')
    } catch (error) {
      addStep('service_init', 'error', `Failed to initialize HubSpot service: ${error}`)
      return NextResponse.json({ debugSteps, error: 'Service initialization failed' }, { status: 500 })
    }

    // Test API connection
    if (testConnection) {
      addStep('connection_test', 'pending', 'Testing HubSpot API connection...')
      try {
        const connectionTest = await hubspotSync.testConnection()
        if (connectionTest.success) {
          addStep('connection_test', 'success', 'HubSpot API connection successful')
        } else {
          addStep('connection_test', 'error', `Connection failed: ${connectionTest.error}`)
          return NextResponse.json({ debugSteps, error: 'Connection test failed' }, { status: 500 })
        }
      } catch (error) {
        addStep('connection_test', 'error', `Connection test threw error: ${error}`)
        return NextResponse.json({ debugSteps, error: 'Connection test failed' }, { status: 500 })
      }
    }

    // Check database connection
    addStep('db_test', 'pending', 'Testing database connection...')
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.from('companies').select('count').limit(1)
      if (error) throw error
      addStep('db_test', 'success', 'Database connection successful')
    } catch (error) {
      addStep('db_test', 'error', `Database connection failed: ${error}`)
      return NextResponse.json({ debugSteps, error: 'Database connection failed' }, { status: 500 })
    }

    // Get current database state
    addStep('db_state', 'pending', 'Checking current database state...')
    try {
      const stats = await hubspotSync.getStats()
      addStep('db_state', 'success', 'Database state retrieved', stats)
    } catch (error) {
      addStep('db_state', 'warning', `Could not get database stats: ${error}`)
    }

    // Perform sync based on type
    if (!dryRun) {
      switch (syncType) {
        case 'companies':
          await debugSyncCompanies(hubspotSync, limit, addStep)
          break
        case 'contacts':
          await debugSyncContacts(hubspotSync, limit, addStep)
          break
        case 'deals':
          await debugSyncDeals(hubspotSync, limit, addStep)
          break
        case 'associations':
          await debugLinkAssociations(hubspotSync, addStep)
          break
        default:
          addStep('sync', 'error', `Unknown sync type: ${syncType}`)
      }
    } else {
      addStep('dry_run', 'success', 'Dry run mode - no actual sync performed')
    }

    const totalDuration = Date.now() - startTime.getTime()
    addStep('complete', 'success', `Debug process completed in ${totalDuration}ms`)

    return NextResponse.json({
      success: true,
      debugSteps,
      summary: {
        totalSteps: debugSteps.length,
        successSteps: debugSteps.filter(s => s.status === 'success').length,
        errorSteps: debugSteps.filter(s => s.status === 'error').length,
        warningSteps: debugSteps.filter(s => s.status === 'warning').length,
        totalDuration
      }
    })

  } catch (error) {
    addStep('fatal_error', 'error', `Fatal error occurred: ${error}`)
    console.error('HubSpot debug error:', error)
    return NextResponse.json({
      success: false,
      debugSteps,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function debugSyncCompanies(hubspotSync: HubSpotSyncService, limit: number, addStep: Function) {
  addStep('companies_start', 'pending', `Starting companies sync with limit: ${limit}`)
  
  try {
    // Test fetching raw data first
    addStep('companies_fetch', 'pending', 'Fetching companies from HubSpot API...')
    
    const companiesCount = await hubspotSync.syncCompanies(limit)
    
    addStep('companies_sync', 'success', `Synced ${companiesCount} companies successfully`)
    
    // Verify in database
    const supabase = await createClient()
    const { data: dbCompanies, error } = await supabase
      .from('companies')
      .select('id, name, hubspot_company_id, hubspot_synced_at')
      .order('hubspot_synced_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    addStep('companies_verify', 'success', `Verified ${dbCompanies?.length || 0} companies in database`, 
      dbCompanies?.map(c => ({ id: c.id, name: c.name, hubspot_id: c.hubspot_company_id })))
    
  } catch (error) {
    addStep('companies_error', 'error', `Companies sync failed: ${error}`)
  }
}

async function debugSyncContacts(hubspotSync: HubSpotSyncService, limit: number, addStep: Function) {
  addStep('contacts_start', 'pending', `Starting contacts sync with limit: ${limit}`)
  
  try {
    const contactsCount = await hubspotSync.syncContacts(limit)
    addStep('contacts_sync', 'success', `Synced ${contactsCount} contacts successfully`)
    
    // Verify in database
    const supabase = await createClient()
    const { data: dbContacts, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, hubspot_contact_id')
      .order('hubspot_synced_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    addStep('contacts_verify', 'success', `Verified ${dbContacts?.length || 0} contacts in database`,
      dbContacts?.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}`, email: c.email })))
    
  } catch (error) {
    addStep('contacts_error', 'error', `Contacts sync failed: ${error}`)
  }
}

async function debugSyncDeals(hubspotSync: HubSpotSyncService, limit: number, addStep: Function) {
  addStep('deals_start', 'pending', `Starting deals sync with limit: ${limit}`)
  
  try {
    const dealsCount = await hubspotSync.syncDeals(limit)
    addStep('deals_sync', 'success', `Synced ${dealsCount} deals successfully`)
    
    // Verify in database
    const supabase = await createClient()
    const { data: dbDeals, error } = await supabase
      .from('deals')
      .select('id, deal_name, deal_stage, deal_value, hubspot_deal_id')
      .order('hubspot_synced_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    addStep('deals_verify', 'success', `Verified ${dbDeals?.length || 0} deals in database`,
      dbDeals?.map(d => ({ id: d.id, name: d.deal_name, stage: d.deal_stage, value: d.deal_value })))
    
  } catch (error) {
    addStep('deals_error', 'error', `Deals sync failed: ${error}`)
  }
}

async function debugLinkAssociations(hubspotSync: HubSpotSyncService, addStep: Function) {
  addStep('associations_start', 'pending', 'Starting associations linking...')
  
  try {
    await hubspotSync.linkAssociations()
    addStep('associations_success', 'success', 'Associations linked successfully')
    
    // Check some associations
    const supabase = await createClient()
    const { data: linkedContacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, company_id, companies!inner(name)')
      .not('company_id', 'is', null)
      .limit(5)
    
    addStep('associations_verify', 'success', `Found ${linkedContacts?.length || 0} linked contacts`,
      linkedContacts?.map(c => ({ 
        contact: `${c.first_name} ${c.last_name}`, 
        company: (c.companies as any)?.name || 'Unknown'
      })))
    
  } catch (error) {
    addStep('associations_error', 'error', `Associations linking failed: ${error}`)
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return debugging information and current state
    const hubspotSync = new HubSpotSyncService()
    const stats = await hubspotSync.getStats()
    
    // Check environment variables
    const envCheck = {
      hasHubSpotApiKey: !!process.env.HUBSPOT_API_KEY,
      apiKeyLength: process.env.HUBSPOT_API_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV
    }

    return NextResponse.json({
      success: true,
      currentState: stats,
      environment: envCheck,
      availableEndpoints: [
        'POST /api/hubspot/debug - Run detailed sync debugging',
        'GET /api/hubspot/debug - Get current state',
        'POST /api/hubspot/sync - Full sync',
        'GET /api/hubspot/sync - Get sync stats'
      ]
    })

  } catch (error) {
    console.error('Debug GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get debug info' },
      { status: 500 }
    )
  }
} 