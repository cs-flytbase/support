import { createClient } from '@/utils/supabase/client';

/**
 * SINGLE SOURCE OF TRUTH for creating Supabase users from Clerk
 * This should be the ONLY place where users are created
 */
export async function ensureSupabaseUser(clerkUser: any) {
  const supabase = createClient();
  
  try {
    // First check if user already exists
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkUser.id)
      .maybeSingle();

    if (queryError) {
      console.error('Error checking for existing user:', queryError);
      throw queryError;
    }

    // If user exists, return their ID
    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      return existingUser.id;
    }

    // User doesn't exist, create them with ONLY the columns that exist
    const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress;
    
    if (!primaryEmail) {
      throw new Error('User has no primary email address');
    }

    // Using the ACTUAL columns from your database schema
    const userData = {
      email: primaryEmail,
      clerk_id: clerkUser.id,
      clerk_user_id: clerkUser.id, // Your table has both fields  
      is_active: true,
      first_name: clerkUser.firstName || null,
      last_name: clerkUser.lastName || null,
      profile_image_url: clerkUser.imageUrl || null, // Correct column name!
      clerk_metadata: clerkUser.publicMetadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(userData)
      .select('id')
      .single();

    if (insertError) {
      // Handle duplicate user creation (race condition)
      if (insertError.code === '23505') {
        console.log('User created by another process, fetching...');
        const { data: raceUser, error: raceError } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', clerkUser.id)
          .single();
        
        if (raceError) throw raceError;
        return raceUser.id;
      }
      
      throw insertError;
    }

    console.log('Created new user:', newUser.id);
    return newUser.id;
    
  } catch (error) {
    console.error('Error ensuring Supabase user:', error);
    throw error;
  }
}
