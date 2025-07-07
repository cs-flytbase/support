import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { HubSpotSyncService } from '@/lib/services/hubspot-sync'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hubspotSync = new HubSpotSyncService()
    
    // Test with just one company to see the exact error
    console.log('🔍 Starting single company debug sync...')
    
    // Access private methods for debugging
    const service = hubspotSync as any
    
    try {
      // Fetch just one company
      console.log('📥 Fetching single company from HubSpot...')
      
      const properties = [
        'name', 'domain', 'website', 'industry', 'annualrevenue',
        'numberofemployees', 'city', 'state', 'country', 'type',
        'description', 'phone'
      ]
      
      const companies = await service.fetchAllPaginated(
        '/crm/v3/objects/companies',
        properties,
        1
      )
      
      if (!companies || companies.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No companies found in HubSpot',
          debug: { companiesCount: 0 }
        })
      }
      
      const company = companies[0]
      console.log('📋 Raw company data:', JSON.stringify(company, null, 2))
      
      // Try to process this single company
      const supabase = await createClient()
      const props = company.properties
      
      console.log('🔧 Processing company properties:', {
        id: company.id,
        name: props.name,
        domain: props.domain,
        industry: props.industry
      })
      
      const companyData = {
        hubspot_company_id: company.id,
        hubspot_raw_data: company,
        name: props.name || 'Unknown Company',
        domain: props.domain || props.website,
        industry: props.industry,
        annual_revenue: service.parseDecimal ? service.parseDecimal(props.annualrevenue) : null,
        employee_count: service.parseInteger ? service.parseInteger(props.numberofemployees) : null,
        type: service.normalizeCompanyType ? service.normalizeCompanyType(props.type) : 'prospect',
        city: props.city,
        state: props.state,
        country: props.country,
        embedding_text: [props.name, props.industry, props.city, props.state]
          .filter(Boolean).join(' '),
        hubspot_synced_at: new Date().toISOString()
      }
      
      console.log('💾 Processed company data:', JSON.stringify(companyData, null, 2))
      
      // Try to insert into database
      console.log('📤 Attempting database insert...')
      const { data, error } = await supabase.from('companies').insert(companyData).select()
      
      if (error) {
        console.error('❌ Database insert error:', error)
        return NextResponse.json({
          success: false,
          error: 'Database insert failed',
          debug: {
            company: {
              id: company.id,
              name: props.name
            },
            companyData,
            databaseError: {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            }
          }
        })
      }
      
      console.log('✅ Successfully inserted company:', data)
      
      return NextResponse.json({
        success: true,
        message: 'Successfully synced single company',
        debug: {
          company: {
            id: company.id,
            name: props.name,
            hubspotData: company,
            processedData: companyData,
            insertedData: data
          }
        }
      })
      
    } catch (fetchError) {
      console.error('❌ Fetch/process error:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'Fetch or processing failed',
        debug: {
          fetchError: {
            message: fetchError instanceof Error ? fetchError.message : String(fetchError),
            stack: fetchError instanceof Error ? fetchError.stack : undefined,
            name: fetchError instanceof Error ? fetchError.name : undefined
          }
        }
      })
    }

  } catch (error) {
    console.error('❌ Debug single company error:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug test failed',
      debug: {
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined
        }
      }
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      message: 'Debug single company endpoint',
      usage: 'POST to this endpoint to sync a single company with detailed debugging'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get debug info' },
      { status: 500 }
    )
  }
} 