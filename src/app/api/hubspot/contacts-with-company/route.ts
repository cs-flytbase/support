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

    // Get contacts with their company information
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        job_title,
        company_id,
        hubspot_contact_id,
        companies:company_id (
          id,
          name
        )
      `)
      .order('first_name')

    if (error) {
      console.error('Error fetching contacts:', error)
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

         // Transform the data to include company name directly
     const contactsWithCompany = contacts?.map(contact => ({
       id: contact.id,
       first_name: contact.first_name,
       last_name: contact.last_name,
       email: contact.email,
       phone: contact.phone,
       job_title: contact.job_title,
       company_id: contact.company_id,
       company_name: (contact.companies as any)?.name || null,
       hubspot_contact_id: contact.hubspot_contact_id,
       deal_count: 0 // This could be calculated if needed
     })) || []

    return NextResponse.json({ contacts: contactsWithCompany })
  } catch (error) {
    console.error('Error in contacts-with-company API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 