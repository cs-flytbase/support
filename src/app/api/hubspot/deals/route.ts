import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { HubSpotSyncService } from '../../../../lib/services/hubspot-sync'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      console.warn('💼 [HubSpot API] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const after = searchParams.get('after') || undefined

    console.log('💼 [HubSpot API] Fetching paginated deals...', { limit, after })
    const hubspotService = new HubSpotSyncService()
    const result = await hubspotService.fetchPaginatedDeals(limit, after)
    console.log(`✅ [HubSpot API] Successfully fetched ${result.deals.length} deals`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [HubSpot API] Error fetching deals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    )
  }
} 