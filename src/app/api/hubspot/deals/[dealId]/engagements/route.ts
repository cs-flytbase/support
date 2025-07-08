import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/utils/supabase/server'
import { HubSpotSyncService } from '@/lib/services/hubspot-sync'

interface SyncResult {
  engagements: number
  startTime: Date
  endTime: Date
  duration: string
  errors: string[]
}

type RouteContext = {
  params: {
    dealId: string
  }
}

export async function POST(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dealId = params.dealId
    if (!dealId) {
      return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 })
    }

    // Check if user has access to this deal
    const supabase = await createClient()
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('hubspot_owner_id')
      .eq('id', dealId)
      .single()

    if (dealError) {
      console.error('Error fetching deal:', dealError)
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Get user's HubSpot owner ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('hubspot_owner_id, email')
      .eq('clerk_id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (either they own the deal or deal is unassigned)
    const hasPermission = !deal.hubspot_owner_id || deal.hubspot_owner_id === user.hubspot_owner_id

    if (!hasPermission) {
      console.warn('Access denied for deal:', {
        dealId,
        dealOwnerId: deal.hubspot_owner_id,
        userId,
        userHubspotId: user.hubspot_owner_id
      })
      return NextResponse.json(
        { error: 'Access denied: You do not have permission to sync engagements for this deal' },
        { status: 403 }
      )
    }

    console.log('🤝 [HubSpot] Starting engagements sync for deal', dealId)
    const hubspotService = new HubSpotSyncService()
    const result = await hubspotService.syncDealEngagements(dealId, userId)

    return NextResponse.json({
      message: 'Engagements synced successfully',
      result
    })
  } catch (error) {
    console.error('Engagements sync failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync engagements' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dealId } = params

    if (!dealId) {
      return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 })
    }

    // Get engagements for this deal from our database
    const supabase = await createClient()

    const { data: engagements, error } = await supabase
      .from('deal_engagements')
      .select('*')
      .eq('deal_id', dealId)
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      engagements: engagements || [],
      count: engagements?.length || 0
    })

  } catch (error) {
    console.error('Get deal engagements error:', error)
    return NextResponse.json(
      { error: 'Failed to get deal engagements' },
      { status: 500 }
    )
  }
} 