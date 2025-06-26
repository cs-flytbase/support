import { NextRequest, NextResponse } from 'next/server';
import { checkMongoDBHealth, isMongoConnected } from '@/utils/mongodb';

/**
 * API endpoint to check database connection health
 * GET /api/db-health
 */
export async function GET(req: NextRequest) {
  console.log('[DB-HEALTH API] Checking database connection health');
  
  try {
    // Check MongoDB connection health
    const mongoStatus = await checkMongoDBHealth();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      mongo: {
        ...mongoStatus,
        isConnected: isMongoConnected()
      }
    }, { 
      status: mongoStatus.status === 'healthy' ? 200 : 503
    });
  } catch (error: any) {
    console.error('[DB-HEALTH API] Error checking database health:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error occurred',
      mongo: {
        connected: false,
        status: 'error',
        isConnected: isMongoConnected()
      }
    }, { 
      status: 500 
    });
  }
}
