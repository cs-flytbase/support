import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { HubSpotSyncService } from '@/lib/services/hubspot-sync'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      console.warn('🔗 [HubSpot API] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔗 [HubSpot API] Starting association linking API call...')
    console.log('🔗 [HubSpot API] User ID:', userId)
    
    const hubspotSync = new HubSpotSyncService()
    
    try {
      await hubspotSync.linkAssociations()
      console.log('✅ [HubSpot API] Association linking API call completed successfully')
      
      return NextResponse.json({ 
        success: true, 
        message: 'Association linking completed' 
      })
    } catch (syncError) {
      console.error('❌ [HubSpot API] Error in linkAssociations:', syncError)
      return NextResponse.json({ 
        error: 'Failed to link associations',
        details: syncError instanceof Error ? syncError.message : 'Unknown sync error',
        type: 'sync_error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('❌ [HubSpot API] Error in route handler:', error)
    return NextResponse.json({ 
      error: 'Failed to link associations',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: 'handler_error'
    }, { status: 500 })
  }
}

