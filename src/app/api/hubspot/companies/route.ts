import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { HubSpotSyncService } from '@/lib/services/hubspot-sync'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const after = searchParams.get('after') || undefined

    const hubspotService = new HubSpotSyncService()
    const result = await hubspotService.fetchPaginatedCompanies(limit, after)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
} 