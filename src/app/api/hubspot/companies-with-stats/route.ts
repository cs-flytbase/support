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

    // Get basic companies first
    const { data: basicCompanies, error: basicError } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        domain,
        industry,
        city,
        state,
        hubspot_company_id
      `)
      .order('name')

    if (basicError) {
      console.error('Error fetching basic companies:', basicError)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    // For each company, get counts separately
    const companiesWithStats = await Promise.all(
      (basicCompanies || []).map(async (company) => {
        const [contactsResult, dealsResult] = await Promise.all([
          supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', company.id),
          supabase
            .from('deals')
            .select('deal_value')
            .eq('company_id', company.id)
        ])

        const contactCount = contactsResult.count || 0
        const dealCount = dealsResult.data?.length || 0
        const totalDealValue = dealsResult.data?.reduce((sum, deal) => 
          sum + (deal.deal_value || 0), 0) || 0

        return {
          ...company,
          contact_count: contactCount,
          deal_count: dealCount,
          total_deal_value: totalDealValue
        }
      })
    )

    return NextResponse.json({ companies: companiesWithStats })
  } catch (error) {
    console.error('Error in companies-with-stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 