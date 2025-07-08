import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { HubSpotSyncService } from '@/lib/services/hubspot-sync'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🚀 [HubSpot API] Starting HubSpot sync process...')
    const body = await request.json()
    const { 
      syncCompanies = true, 
      syncContacts = true, 
      syncDeals = true,
      companiesLimit = 1000,
      contactsLimit = 1000, 
      dealsLimit = 1000,
      batchMode = false
    } = body

    console.log('🚀 [HubSpot API] Sync options:', { 
      syncCompanies, 
      syncContacts, 
      syncDeals, 
      companiesLimit, 
      contactsLimit, 
      dealsLimit,
      batchMode 
    })

    const hubspotSync = new HubSpotSyncService()
    const stats = {
      companies: 0,
      contacts: 0,
      deals: 0,
      startTime: new Date(),
      errors: [] as string[]
    }

    // Phase 1: Sync companies
    if (syncCompanies) {
      console.log('🚀 [HubSpot API] Phase 1: Starting companies sync...')
      try {
        if (batchMode) {
          let offset = 0
          let totalSynced = 0
          while (true) {
            const batchCount = await hubspotSync.syncCompanies(companiesLimit, offset)
            if (batchCount === 0) break
            totalSynced += batchCount
            offset += companiesLimit
            console.log(`📈 [HubSpot API] Companies synced: ${totalSynced}`)
          }
          stats.companies = totalSynced
        } else {
          stats.companies = await hubspotSync.syncCompanies(companiesLimit)
        }
        console.log(`✅ [HubSpot API] Phase 1 complete: ${stats.companies} companies synced`)
      } catch (error) {
        const errorMsg = `Companies sync failed: ${error}`
        console.error('❌ [HubSpot API] Phase 1 failed:', errorMsg)
        stats.errors.push(errorMsg)
      }
    }

    // Phase 2: Sync contacts
    if (syncContacts) {
      console.log('🚀 [HubSpot API] Phase 2: Starting contacts sync...')
      try {
        if (batchMode) {
          let offset = 0
          let totalSynced = 0
          while (true) {
            const batchCount = await hubspotSync.syncContacts(contactsLimit, offset)
            if (batchCount === 0) break
            totalSynced += batchCount
            offset += contactsLimit
            console.log(`📈 [HubSpot API] Contacts synced: ${totalSynced}`)
          }
          stats.contacts = totalSynced
        } else {
          stats.contacts = await hubspotSync.syncContacts(contactsLimit)
        }
        console.log(`✅ [HubSpot API] Phase 2 complete: ${stats.contacts} contacts synced`)
      } catch (error) {
        const errorMsg = `Contacts sync failed: ${error}`
        console.error('❌ [HubSpot API] Phase 2 failed:', errorMsg)
        stats.errors.push(errorMsg)
      }
    }

    // Phase 3: Sync deals
    if (syncDeals) {
      console.log('🚀 [HubSpot API] Phase 3: Starting deals sync...')
      try {
        if (batchMode) {
          let offset = 0
          let totalSynced = 0
          while (true) {
            const batchCount = await hubspotSync.syncDeals(dealsLimit, offset)
            if (batchCount === 0) break
            totalSynced += batchCount
            offset += dealsLimit
            console.log(`📈 [HubSpot API] Deals synced: ${totalSynced}`)
          }
          stats.deals = totalSynced
        } else {
          stats.deals = await hubspotSync.syncDeals(dealsLimit)
        }
        console.log(`✅ [HubSpot API] Phase 3 complete: ${stats.deals} deals synced`)
      } catch (error) {
        const errorMsg = `Deals sync failed: ${error}`
        console.error('❌ [HubSpot API] Phase 3 failed:', errorMsg)
        stats.errors.push(errorMsg)
      }
    }

    // Phase 4: Link associations
    console.log('🚀 [HubSpot API] Phase 4: Starting association linking...')
    try {
      await hubspotSync.linkAssociations()
      console.log('✅ [HubSpot API] Phase 4 complete: associations linked')
    } catch (error) {
      const errorMsg = `Association linking failed: ${error}`
      console.error('❌ [HubSpot API] Phase 4 failed:', errorMsg)
      stats.errors.push(errorMsg)
    }

    const endTime = new Date()
    const duration = (endTime.getTime() - stats.startTime.getTime()) / 1000

    console.log('🎉 [HubSpot API] Sync process completed!')
    console.log('📊 [HubSpot API] Final Summary:')
    console.log(`   • Companies: ${stats.companies}`)
    console.log(`   • Contacts: ${stats.contacts}`)
    console.log(`   • Deals: ${stats.deals}`)
    console.log(`   • Errors: ${stats.errors.length}`)
    console.log(`   • Duration: ${duration.toFixed(2)}s`)

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        endTime,
        duration: `${duration.toFixed(2)}s`
      }
    })

  } catch (error) {
    console.error('HubSpot sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync HubSpot data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hubspotSync = new HubSpotSyncService()
    const stats = await hubspotSync.getStats()

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Get HubSpot stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get HubSpot stats' },
      { status: 500 }
    )
  }
} 