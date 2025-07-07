import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { HubSpotSyncService } from '@/lib/services/hubspot-sync'

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      console.warn('👥 [HubSpot API] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('👥 [HubSpot API] Starting owners fetch...')
    const hubspotSync = new HubSpotSyncService()
    
    const owners = await hubspotSync.fetchDealOwners()
    console.log(`✅ [HubSpot API] Successfully fetched ${owners.length} owners`)
    
    return NextResponse.json({ owners })
  } catch (error) {
    console.error('❌ [HubSpot API] Error fetching owners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch owners' },
      { status: 500 }
    )
  }
} 