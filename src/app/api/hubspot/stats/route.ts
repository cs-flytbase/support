import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { HubSpotSyncService } from '@/lib/services/hubspot-sync'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📊 [HubSpot API] Fetching HubSpot stats...')
    const hubspotSync = new HubSpotSyncService()
    
    // Get basic stats
    const stats = await hubspotSync.getStats()
    
    // Get association counts
    const associationCounts = await hubspotSync.getAssociationCounts()

    console.log('📊 [HubSpot API] Stats retrieved successfully')
    console.log('   • Companies:', stats.companies)
    console.log('   • Contacts:', stats.contacts)
    console.log('   • Deals:', stats.deals)
    console.log('\n📊 [HubSpot API] Association Counts:')
    console.log('   • Total Associations:', associationCounts.total)
    console.log('   • Contact-to-Company:', associationCounts.contactToCompany)
    console.log('   • Deal-to-Company:', associationCounts.dealToCompany)

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        associations: associationCounts
      }
    })
  } catch (error) {
    console.error('❌ [HubSpot API] Error fetching stats:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 