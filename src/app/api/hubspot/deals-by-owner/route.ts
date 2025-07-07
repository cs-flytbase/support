import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // First get all deals with their owners
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select(`
        id,
        deal_name,
        deal_stage,
        deal_value,
        close_date,
        is_closed,
        is_closed_won,
        hubspot_owner_id,
        companies (
          name,
          domain
        )
      `)
      .order('created_at', { ascending: false })

    if (dealsError) {
      console.error('Error fetching deals:', dealsError)
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }

    // Get all unique owner IDs
    const ownerIds = [...new Set(deals.map(deal => deal.hubspot_owner_id).filter(Boolean))]

    // Get owner details from users table
    const { data: owners, error: ownersError } = await supabase
      .from('users')
      .select('clerk_id, email, hubspot_owner_id')
      .in('hubspot_owner_id', ownerIds)

    if (ownersError) {
      console.error('Error fetching owners:', ownersError)
      return NextResponse.json({ error: 'Failed to fetch owners' }, { status: 500 })
    }

    // Group deals by owner
    const dealsByOwner = ownerIds.map(ownerId => {
      const ownerDeals = deals.filter(deal => deal.hubspot_owner_id === ownerId)
      const owner = owners.find(o => o.hubspot_owner_id === ownerId)
      
      return {
        hubspot_owner_id: ownerId,
        owner_email: owner?.email || 'Unknown',
        total_deals: ownerDeals.length,
        total_value: ownerDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0),
        won_deals: ownerDeals.filter(d => d.is_closed_won).length,
        open_deals: ownerDeals.filter(d => !d.is_closed).length,
        deals: ownerDeals.map(deal => ({
          id: deal.id,
          name: deal.deal_name,
          stage: deal.deal_stage,
          value: deal.deal_value,
          close_date: deal.close_date,
          company_name: deal.companies?.name,
          company_domain: deal.companies?.domain,
          is_closed: deal.is_closed,
          is_won: deal.is_closed_won
        }))
      }
    })

    // Also include unassigned deals
    const unassignedDeals = deals.filter(deal => !deal.hubspot_owner_id)
    if (unassignedDeals.length > 0) {
      dealsByOwner.push({
        hubspot_owner_id: null,
        owner_email: 'Unassigned',
        total_deals: unassignedDeals.length,
        total_value: unassignedDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0),
        won_deals: unassignedDeals.filter(d => d.is_closed_won).length,
        open_deals: unassignedDeals.filter(d => !d.is_closed).length,
        deals: unassignedDeals.map(deal => ({
          id: deal.id,
          name: deal.deal_name,
          stage: deal.deal_stage,
          value: deal.deal_value,
          close_date: deal.close_date,
          company_name: deal.companies?.name,
          company_domain: deal.companies?.domain,
          is_closed: deal.is_closed,
          is_won: deal.is_closed_won
        }))
      })
    }

    return NextResponse.json({
      dealsByOwner,
      totalOwners: ownerIds.length,
      totalDeals: deals.length,
      totalValue: deals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0)
    })
  } catch (error) {
    console.error('Error in deals-by-owner:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 