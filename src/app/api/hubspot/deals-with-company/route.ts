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

    // Get deals with their company information
    const { data: deals, error } = await supabase
      .from('deals')
      .select(`
        id,
        deal_name,
        deal_stage,
        deal_value,
        close_date,
        company_id,
        hubspot_deal_id,
        hubspot_owner_id,
        is_closed,
        is_closed_won,
        companies:company_id (
          id,
          name
        )
      `)
      .order('deal_name')

    if (error) {
      console.error('Error fetching deals:', error)
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }

    // Transform the data to include company name directly
    const dealsWithCompany = deals?.map(deal => ({
      id: deal.id,
      deal_name: deal.deal_name,
      deal_stage: deal.deal_stage,
      deal_value: deal.deal_value,
      close_date: deal.close_date,
      company_id: deal.company_id,
      company_name: (deal.companies as any)?.name || null,
      hubspot_deal_id: deal.hubspot_deal_id,
      hubspot_owner_id: deal.hubspot_owner_id,
      is_closed: deal.is_closed,
      is_closed_won: deal.is_closed_won
    })) || []

    return NextResponse.json({ deals: dealsWithCompany })
  } catch (error) {
    console.error('Error in deals-with-company API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 