import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/utils/supabase/server';

// GET handler to fetch all handbooks for the current user
export async function GET(req: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await auth();
    const userId = authResult.userId;
    
    if (!userId) {
      console.log('Authentication failed: No user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Initialize Supabase client
    const supabase = createClient();
    
    // Fetch all handbooks for this user
    const { data, error } = await supabase
      .from('solution_handbooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching handbooks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Return the handbook data
    return NextResponse.json(data || []);
    
  } catch (error: any) {
    console.error('Unexpected error in GET /api/solution-handbooks:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
