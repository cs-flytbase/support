import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/utils/supabase/server';

// GET handler to fetch a specific handbook by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the user
    const authResult = await auth();
    const userId = authResult.userId;
    
    if (!userId) {
      console.log('Authentication failed: No user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log(`User ${userId} requesting handbook ${params.id}`);
    
    // Initialize Supabase client
    const supabase = createClient();
    
    // Fetch the handbook by ID
    const { data, error } = await supabase
      .from('solution_handbooks')
      .select('*')
      .eq('id', params.id)
      .limit(1);
      
    if (error) {
      console.error('Error fetching handbook:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Handbook not found' }, { status: 404 });
    }
    
    // Return the handbook data
    return NextResponse.json(data[0]);
    
  } catch (error: any) {
    console.error('Unexpected error in GET /api/solution-handbooks/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
