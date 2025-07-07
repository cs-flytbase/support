import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { HubSpotSyncService } from '@/lib/services/hubspot-sync'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 [HubSpot API] Checking for duplicate associations...')
    const hubspotSync = new HubSpotSyncService()
    
    const duplicates = await hubspotSync.checkDuplicateAssociations()

    return NextResponse.json({
      success: true,
      duplicates
    })

  } catch (error) {
    console.error('Error checking duplicates:', error)
    return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 })
  }
} 