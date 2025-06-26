import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customer_id: string }> }
) {
  try {
    const supabase = createClient();
    const { customer_id } = await params;

    // Fetch deals for the specific customer by joining deals and deal_customers tables
    const { data: deals, error } = await supabase
      .from('deals')
      .select(`
        id,
        deal_name,
        amount,
        currency,
        deal_stage,
        close_date,
        status,
        pipeline,
        deal_type,
        forecast_amount,
        projected_amount,
        deal_stage_probability,
        is_closed,
        is_closed_won,
        is_closed_lost,
        priority,
        deal_customers!inner(
          customer_id,
          relationship_type
        )
      `)
      .eq('deal_customers.customer_id', customer_id)
      .eq('archived', false)
      .order('close_date', { ascending: true });

    if (error) {
      console.error('Error fetching deals:', error);
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedDeals = deals?.map(deal => ({
      id: deal.id,
      name: deal.deal_name,
      stage: deal.deal_stage,
      closureDate: deal.close_date ? new Date(deal.close_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) : 'TBD',
      amount: deal.amount,
      currency: deal.currency,
      status: deal.status,
      pipeline: deal.pipeline,
      dealType: deal.deal_type,
      forecastAmount: deal.forecast_amount,
      projectedAmount: deal.projected_amount,
      probability: deal.deal_stage_probability,
      isClosed: deal.is_closed,
      isClosedWon: deal.is_closed_won,
      isClosedLost: deal.is_closed_lost,
      priority: deal.priority,
      relationshipType: deal.deal_customers?.[0]?.relationship_type
    })) || [];

    return NextResponse.json({ deals: transformedDeals });
  } catch (error) {
    console.error('Error in deals API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
