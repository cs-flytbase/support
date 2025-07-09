import { Client } from '@hubspot/api-client'
import { supabaseClient } from '@/utils/supabase/client'

export class HubSpotSyncService {
  private client: Client
  private batchSize = 100

  constructor() {
    this.client = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN })
  }

  // Sync companies from HubSpot to database
  async syncCompanies() {
    console.log('Starting company sync')
    const companies = []
    let after = undefined

    try {
      do {
        const response = await this.client.crm.companies.basicApi.getPage(
          this.batchSize,
          after,
          ['name', 'domain', 'website', 'phone', 'industry'],
          undefined,
          undefined,
          false
        )

        companies.push(...response.results)
        after = response.paging?.next?.after
      } while (after)

      // Store companies in database
      for (const company of companies) {
        await this.upsertCompany(company)
      }

      console.log(`Synced ${companies.length} companies`)
      return companies
    } catch (error) {
      console.error('Company sync failed:', error)
      throw error
    }
  }

  // Sync contacts from HubSpot to database
  async syncContacts() {
    console.log('Starting contact sync')
    const contacts = []
    let after = undefined

    try {
      do {
        const response = await this.client.crm.contacts.basicApi.getPage(
          this.batchSize,
          after,
          ['email', 'firstname', 'lastname', 'phone', 'company'],
          undefined,
          undefined,
          false
        )

        contacts.push(...response.results)
        after = response.paging?.next?.after
      } while (after)

      // Store contacts in database
      for (const contact of contacts) {
        await this.upsertContact(contact)
      }

      console.log(`Synced ${contacts.length} contacts`)
      return contacts
    } catch (error) {
      console.error('Contact sync failed:', error)
      throw error
    }
  }

  // Sync deals from HubSpot to database
  async syncDeals() {
    console.log('Starting deal sync')
    const deals = []
    let after = undefined

    try {
      do {
        const response = await this.client.crm.deals.basicApi.getPage(
          this.batchSize,
          after,
          ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate'],
          undefined,
          undefined,
          false
        )

        deals.push(...response.results)
        after = response.paging?.next?.after
      } while (after)

      // Store deals in database
      for (const deal of deals) {
        await this.upsertDeal(deal)
      }

      console.log(`Synced ${deals.length} deals`)
      return deals
    } catch (error) {
      console.error('Deal sync failed:', error)
      throw error
    }
  }

  // Create email engagement in HubSpot
  async createEmailEngagement(emailData: any) {
    try {
      const engagement = {
        engagement: {
          type: 'EMAIL',
          timestamp: new Date().getTime()
        },
        associations: {
          contactIds: emailData.contactIds || [],
          companyIds: emailData.companyIds || [],
          dealIds: emailData.dealIds || []
        },
        metadata: {
          from: {
            email: emailData.from
          },
          to: emailData.to,
          subject: emailData.subject,
          text: emailData.snippet || emailData.body
        }
      }

      const response = await this.client.apiRequest({
        method: 'POST',
        path: '/engagements/v1/engagements',
        body: engagement
      })
      console.log('Created email engagement:', response)
      return response
    } catch (error) {
      console.error('Failed to create email engagement:', error)
      throw error
    }
  }

  // Create meeting engagement in HubSpot
  async createMeetingEngagement(eventData: any) {
    try {
      const engagement = {
        engagement: {
          type: 'MEETING',
          timestamp: new Date(eventData.start.dateTime).getTime()
        },
        associations: {
          contactIds: eventData.contactIds || [],
          companyIds: eventData.companyIds || [],
          dealIds: eventData.dealIds || []
        },
        metadata: {
          title: eventData.summary,
          description: eventData.description,
          startTime: eventData.start.dateTime,
          endTime: eventData.end.dateTime,
          location: eventData.location
        }
      }

      const response = await this.client.apiRequest({
        method: 'POST',
        path: '/engagements/v1/engagements',
        body: engagement
      })
      console.log('Created meeting engagement:', response)
      return response
    } catch (error) {
      console.error('Failed to create meeting engagement:', error)
      throw error
    }
  }

  // Link associations between objects
  async linkAssociations() {
    try {
      // Get all objects that need associations
      const { data: pendingAssociations, error } = await supabaseClient
        .from('pending_associations')
        .select('*')
        .eq('status', 'pending')

      if (error) throw error

      // Process each pending association
      for (const assoc of pendingAssociations) {
        await this.createAssociation(assoc)
        
        // Mark as processed
        await supabaseClient
          .from('pending_associations')
          .update({ status: 'completed' })
          .eq('id', assoc.id)
      }

      console.log(`Processed ${pendingAssociations.length} associations`)
    } catch (error) {
      console.error('Failed to link associations:', error)
      throw error
    }
  }

  // Get sync statistics
  async getStats() {
    try {
      const [companies, contacts, deals] = await Promise.all([
        this.client.crm.companies.basicApi.getPage(),
        this.client.crm.contacts.basicApi.getPage(),
        this.client.crm.deals.basicApi.getPage()
      ])

      return {
        totalCompanies: companies.results.length,
        totalContacts: contacts.results.length,
        totalDeals: deals.results.length
      }
    } catch (error) {
      console.error('Failed to get stats:', error)
      throw error
    }
  }

  // Fetch paginated companies from HubSpot
  async fetchPaginatedCompanies(limit: number, after?: string) {
    try {
      const response = await this.client.crm.companies.basicApi.getPage(
        limit,
        after,
        ['name', 'domain', 'website', 'phone', 'industry'],
        undefined,
        undefined,
        false
      )
      return response
    } catch (error) {
      console.error('Failed to fetch companies:', error)
      throw error
    }
  }

  // Fetch paginated contacts from HubSpot
  async fetchPaginatedContacts(limit: number, after?: string) {
    try {
      const response = await this.client.crm.contacts.basicApi.getPage(
        limit,
        after,
        ['email', 'firstname', 'lastname', 'phone', 'company'],
        undefined,
        undefined,
        false
      )
      return response
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
      throw error
    }
  }

  // Fetch paginated deals from HubSpot
  async fetchPaginatedDeals(limit: number, after?: string) {
    try {
      const response = await this.client.crm.deals.basicApi.getPage(
        limit,
        after,
        ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate'],
        undefined,
        undefined,
        false
      )
      return { deals: response.results, paging: response.paging }
    } catch (error) {
      console.error('Failed to fetch deals:', error)
      throw error
    }
  }

  // Helper methods
  private async upsertCompany(company: any) {
    const { error } = await supabaseClient
      .from('companies')
      .upsert({
        hubspot_id: company.id,
        name: company.properties.name,
        domain: company.properties.domain,
        website: company.properties.website,
        phone: company.properties.phone,
        industry: company.properties.industry
      })

    if (error) throw error
  }

  private async upsertContact(contact: any) {
    const { error } = await supabaseClient
      .from('contacts')
      .upsert({
        hubspot_id: contact.id,
        email: contact.properties.email,
        first_name: contact.properties.firstname,
        last_name: contact.properties.lastname,
        phone: contact.properties.phone,
        company: contact.properties.company
      })

    if (error) throw error
  }

  private async upsertDeal(deal: any) {
    const { error } = await supabaseClient
      .from('deals')
      .upsert({
        hubspot_id: deal.id,
        name: deal.properties.dealname,
        amount: deal.properties.amount,
        stage: deal.properties.dealstage,
        pipeline: deal.properties.pipeline,
        close_date: deal.properties.closedate
      })

    if (error) throw error
  }

  private async createAssociation(assoc: any) {
    try {
      await this.client.apiRequest({
        method: 'POST',
        path: `/crm/v4/associations/${assoc.from_type}/${assoc.to_type}/batch/create`,
        body: {
          inputs: [{
            from: { id: assoc.from_id },
            to: { id: assoc.to_id },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: assoc.association_type }]
          }]
        }
      })
    } catch (error) {
      console.error('Failed to create association:', error)
      throw error
    }
  }

  // Sync engagements for a specific deal
  async syncDealEngagements(dealId: string, userId: string) {
    try {
      const response = await (await this.client.apiRequest({
        method: 'GET',
        path: `/crm/v4/objects/deals/${dealId}/associations/notes`
      })).json() as { results: Array<{ id: string }> };

      const engagements = await Promise.all(
        response.results.map(async (result) => {
          const engagement = await (await this.client.apiRequest({
            method: 'GET',
            path: `/crm/v4/objects/notes/${result.id}`,
            qs: { properties: ['hs_note_body', 'hs_timestamp', 'hs_note_type'] }
          })).json() as { id: string, properties: { hs_note_body: string, hs_timestamp: string, hs_note_type: string } };

          return {
            deal_id: dealId,
            user_id: userId,
            engagement_id: engagement.id,
            type: engagement.properties.hs_note_type,
            title: 'Note',
            description: engagement.properties.hs_note_body,
            timestamp: engagement.properties.hs_timestamp,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        })
      )

      // Store engagements in database
      const supabase = supabaseClient
      await supabase.from('deal_engagements').upsert(engagements)

      return {
        engagements: engagements.length,
        startTime: new Date(),
        endTime: new Date(),
        duration: '0s',
        errors: []
      }
    } catch (error) {
      console.error('Failed to sync deal engagements:', error)
      throw error
    }
  }
} 