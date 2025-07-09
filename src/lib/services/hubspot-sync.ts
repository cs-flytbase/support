import { createClient } from '@/utils/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { Database } from '@/utils/supabase/database.types'
import { createServerClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

interface HubSpotConfig {
  apiKey: string
  baseUrl?: string
  startTime?: Date
  endTime?: Date
}

interface SyncStats {
  companies: number
  contacts: number 
  deals: number
  engagements: number
  errors: string[]
  startTime: Date
  endTime?: Date
}

interface HubSpotCompany {
  id: string
  properties: {
    name?: string
    domain?: string
    website?: string
    industry?: string
    annualrevenue?: string
    numberofemployees?: string
    city?: string
    state?: string
    country?: string
    type?: string
    description?: string
    phone?: string
  }
}

interface HubSpotContact {
  id: string
  properties: {
    firstname?: string
    lastname?: string
    email?: string
    phone?: string
    jobtitle?: string
    company?: string
    lifecyclestage?: string
    createdate?: string
  }
}

interface HubSpotDeal {
  id: string
  properties: {
    dealname?: string
    dealstage?: string
    amount?: string
    closedate?: string
    createdate?: string
    pipeline?: string
    dealtype?: string
    description?: string
    hubspot_owner_id?: string
  }
}

interface HubSpotEngagement {
  id: string
  type: 'NOTE' | 'EMAIL' | 'CALL' | 'MEETING' | 'TASK'
  properties: {
    hs_timestamp?: string
    hs_body_preview?: string
    hs_subject?: string
    hs_activity_type?: string
  }
  associations?: {
    deals?: string[]
    contacts?: string[]
    companies?: string[]
  }
}

interface HubSpotAssociation {
  to_object_type: string
  to_object_id: string
  type: string
}

interface DuplicateAssociation {
  from_object_id: string
  to_object_id: string
  from_object_type: string
  to_object_type: string
  count: number
}

interface ParsedObjectId {
  id: string;
  type: string;
}

type SyncPhase = 'starting' | 'processing' | 'complete'

interface SyncProgress {
  total: number;
  processed: number;
  phase: string;
  startTime: number;
  endTime?: number;
  errors?: number;
}

type SupabaseClientType = SupabaseClient<Database>

interface AssociationType {
  from: string & keyof Database['public']['Tables']
  to: string & keyof Database['public']['Tables']
}

type HubspotObject = {
  id: number
  [key: string]: any
}

// Fix dynamic property access
const getHubspotIdField = (table: string & keyof Database['public']['Tables']): string => {
  switch (table) {
    case 'companies':
      return 'hubspot_company_id'
    case 'contacts':
      return 'hubspot_contact_id'
    case 'deals':
      return 'hubspot_deal_id'
    default:
      throw new Error(`Unknown table: ${table}`)
  }
}

type TableRow = Database['public']['Tables'][keyof Database['public']['Tables']]['Row']
type HubspotTableRow = TableRow & { [key: string]: unknown }

// Type guard for objects with hubspot IDs
type HubspotRecord = {
  id: string | number;
  hubspot_id?: string;
  hubspot_deal_id?: string;
  [hubspotIdField: string]: any;
}

interface AssociationCounts {
  total: number;
  contactToCompany: number;
  dealToCompany: number;
  contactToDeal: number;
}

const associationTypes: AssociationType[] = [
  { from: 'contacts', to: 'companies' },
  { from: 'deals', to: 'companies' },
  { from: 'contacts', to: 'deals' }
];

// Add type for database row with HubSpot ID
type DatabaseRowWithHubspotId = {
  id: string | number;
  [key: string]: unknown;
}

export class HubSpotSyncService {
  private config: HubSpotConfig
  private headers: Record<string, string>
  private requestDelay = 100 // 100ms between requests
  private maxRetries = 3
  private debug = process.env.NODE_ENV === 'development'
  private supabase: SupabaseClientType | null = null
  private apiKey: string

  constructor() {
    const apiKey = process.env.HUBSPOT_API_KEY
    if (!apiKey) {
      throw new Error('HUBSPOT_API_KEY environment variable is required')
    }
    this.apiKey = apiKey
    this.config = {
      apiKey: apiKey,
      baseUrl: 'https://api.hubapi.com'
    }
    
    this.headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json'
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    if (this.debug || level === 'error') {
      console[level](`[HubSpot] ${message}`, data || '')
    }
  }

  private async getSupabase(): Promise<SupabaseClientType> {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  private async makeRequest<T>(endpoint: string, params: any = {}): Promise<T> {
    let retries = 0
    while (retries < this.maxRetries) {
      try {
        const url = new URL(`https://api.hubapi.com${endpoint}`)
        
        // Add query parameters for GET requests
        if (params.method === 'GET' && params.params) {
          Object.entries(params.params).forEach(([key, value]) => {
            if (value !== undefined) {
              url.searchParams.append(key, String(value))
            }
          })
        }

        const response = await fetch(url.toString(), {
          method: params.method || 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          ...params,
          // Remove params from the fetch options since we've added them to the URL
          params: undefined
        })

        if (!response.ok) {
          throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        retries++
        if (retries === this.maxRetries) {
          throw error
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000))
      }
    }
    throw new Error('Max retries exceeded')
  }

  private async fetchAllPaginated<T>(
    endpoint: string, 
    properties: string[], 
    limit?: number,
    offset?: number
  ): Promise<T[]> {
    const allData: T[] = []
    let after: string | undefined
    let fetched = 0
    let skipped = 0
    let pageCount = 0
    const startTime = Date.now()

    try {
    while (true) {
      if (limit && fetched >= limit) break
        pageCount++

      const params: Record<string, any> = {
          limit: 100, // Max page size
        properties: properties.join(',')
      }
      if (after) params.after = after

        this.log('info', `📄 Fetching page ${pageCount} from ${endpoint}`, {
          fetched,
          limit,
          pageCount
        })

      const response = await this.makeRequest<{
        results: T[]
        paging?: { next?: { after: string } }
      }>(endpoint, params)

      if (!response.results?.length) break

        if (offset && skipped < offset) {
          const remaining = offset - skipped
          const toSkip = Math.min(remaining, response.results.length)
          skipped += toSkip
          if (toSkip < response.results.length) {
            allData.push(...response.results.slice(toSkip))
            fetched += response.results.length - toSkip
          }
        } else {
      allData.push(...response.results)
      fetched += response.results.length
        }

        after = response.paging?.next?.after
        if (!after) break

        // Log progress
        const elapsedSeconds = (Date.now() - startTime) / 1000
        const rate = fetched / elapsedSeconds
        this.log('info', `📊 Fetch progress for ${endpoint}`, {
          fetched,
          totalPages: pageCount,
          elapsedSeconds: Math.round(elapsedSeconds),
          recordsPerSecond: Math.round(rate)
        })
      }

      const totalTime = (Date.now() - startTime) / 1000
      this.log('info', `✅ Completed fetching from ${endpoint}`, {
        totalRecords: fetched,
        totalPages: pageCount,
        totalTimeSeconds: Math.round(totalTime),
        averageRecordsPerSecond: Math.round(fetched / totalTime)
      })

    return allData
    } catch (error) {
      this.log('error', `❌ Error in fetchAllPaginated for ${endpoint}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        fetched,
        pageCount
      })
      throw error
    }
  }

  private parseDecimal(value: any): number | null {
    if (!value) return null
    try {
      return parseFloat(String(value).replace(/,/g, ''))
    } catch {
      return null
    }
  }

  private parseInteger(value: any): number | null {
    if (!value) return null
    try {
      return parseInt(String(value).replace(/,/g, ''))
    } catch {
      return null
    }
  }

  private parseDate(value: any): string | null {
    if (!value) return null
    try {
      const timestamp = parseInt(value) / 1000
      return new Date(timestamp * 1000).toISOString()
    } catch {
      return null
    }
  }

  private normalizeCompanyType(hubspotType: any): string {
    if (!hubspotType) return 'prospect'
    
    const typeMapping: Record<string, string> = {
      'partner': 'partner',
      'customer': 'end_customer', 
      'prospect': 'prospect',
      'vendor': 'partner',
      'reseller': 'partner',
      'other': 'prospect'
    }
    
    return typeMapping[String(hubspotType).toLowerCase()] || 'prospect'
  }

  private async insertOrUpdateSupabase(
    table: string,
    records: any[],
    onConflict: string
  ): Promise<{ inserted: number; errors: string[] }> {
    const supabase = await this.getSupabase()
    const { error, count } = await supabase
      .from(table)
      .upsert(records, { onConflict })
      .select()

    if (error) {
      this.log('error', `Error inserting/updating records in ${table}`, error)
      return { inserted: 0, errors: [error.message] }
    }

    return { inserted: count || 0, errors: [] }
  }

  async syncCompanies(limit?: number, offset?: number): Promise<number> {
    this.log('info', '🏢 Starting companies sync', {
      limit: limit || 'unlimited',
      offset: offset || 'none'
    })

    const startTime = Date.now()
    let syncedCount = 0
    const errors: string[] = []

    try {
      const companies = await this.fetchAllPaginated<HubSpotCompany>(
        '/crm/v3/objects/companies',
        [
          'name',
          'domain',
          'website',
          'industry',
          'annualrevenue',
          'numberofemployees',
          'city',
          'state',
          'country',
          'type',
          'description',
          'phone'
        ],
        limit,
        offset
      )

      if (companies.length > 0) {
        const formattedCompanies = companies.map(company => ({
          hubspot_company_id: company.id,
          name: company.properties.name,
          domain: company.properties.domain,
          website: company.properties.website,
          industry: company.properties.industry,
          annual_revenue: this.parseDecimal(company.properties.annualrevenue),
          employees: this.parseInteger(company.properties.numberofemployees),
          city: company.properties.city,
          state: company.properties.state,
          country: company.properties.country,
          type: this.normalizeCompanyType(company.properties.type),
          description: company.properties.description,
          phone: company.properties.phone
        }))

        this.log('info', '🔄 Upserting companies to database', {
          count: formattedCompanies.length
        })

        const { inserted, errors: upsertErrors } = await this.insertOrUpdateSupabase(
          'companies',
          formattedCompanies,
          'hubspot_company_id'
        )

        syncedCount = inserted
        errors.push(...upsertErrors)
      }

      const duration = (Date.now() - startTime) / 1000
      this.log('info', '🎉 Companies sync completed', {
        syncedCount,
        errors,
        duration: `${duration.toFixed(2)}s`
      })

      return syncedCount
      } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      this.log('error', '❌ Companies sync failed', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : error,
        duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
      })
      throw new Error(`Companies sync failed: ${errorMsg}`)
    }
  }

  async syncContacts(limit?: number, offset?: number): Promise<number> {
    const startTime = Date.now()
    let totalContacts = 0
    let processedContacts = 0
    let after: string | undefined

    try {
      // Get total count first
      const countResponse = await this.makeRequest<{
        total: number
      }>('/crm/v3/objects/contacts', { count: true })
      totalContacts = countResponse.total

      // Emit initial progress
      this.emitProgress('contacts', {
        total: totalContacts,
        processed: 0,
        phase: 'starting',
        startTime
      })

      while (true) {
        if (limit && processedContacts >= limit) break

        const contacts = await this.makeRequest<{
          results: Array<{
            id: string
            properties: {
              email?: string
              firstname?: string
              lastname?: string
              phone?: string
              company?: string
              jobtitle?: string
            }
          }>
          paging?: { next?: { after: string } }
        }>('/crm/v3/objects/contacts', {
          limit: 100,
          properties: [
            'email',
            'firstname',
            'lastname',
            'phone',
            'company',
            'jobtitle'
          ],
          after
        })

        if (!contacts.results?.length) break

        const supabase = await this.getSupabase()
        
        // Prepare batch for Supabase
        const batch = contacts.results.map(contact => ({
          hubspot_id: contact.id,
          email: contact.properties.email,
          first_name: contact.properties.firstname,
          last_name: contact.properties.lastname,
          phone: contact.properties.phone,
          company: contact.properties.company,
          job_title: contact.properties.jobtitle,
          raw_data: contact,
          hubspot_synced_at: new Date().toISOString()
        }))

        // Upload batch to Supabase
        const { error } = await supabase
          .from('contacts')
          .upsert(batch, {
            onConflict: 'hubspot_id'
          })

        if (error) {
          throw error
        }

        processedContacts += contacts.results.length

        // Emit progress
        this.emitProgress('contacts', {
          total: totalContacts,
          processed: processedContacts,
          phase: 'processing',
          startTime
        })

        // Check if we have more pages
        if (!contacts.paging?.next?.after) {
          break
        }
        after = contacts.paging.next.after
      }

      // Emit completion
      this.emitProgress('contacts', {
        total: totalContacts,
        processed: processedContacts,
        phase: 'complete',
        startTime,
        endTime: Date.now()
      })

      return processedContacts
    } catch (error) {
      console.error('Failed to sync contacts:', error)
      throw error
    }
  }

  private emitProgress(type: string, progress: SyncProgress) {
    if (typeof window === 'undefined') return

    const now = Date.now()
    const elapsed = now - progress.startTime
    const recordsPerSecond = progress.processed / (elapsed / 1000)
    const remaining = progress.total - progress.processed
    const estimatedTimeRemaining = remaining / recordsPerSecond

    const event = new CustomEvent('hubspot-sync-progress', {
      detail: {
        type,
        ...progress,
        recordsPerSecond,
        estimatedTimeRemaining,
        elapsedTime: elapsed
      }
    })
    window.dispatchEvent(event)
  }

  private async mapHubSpotOwnerToClerk(hubspotOwnerId: string): Promise<void> {
    try {
      this.log('info', `🔄 Mapping HubSpot owner ${hubspotOwnerId} to Clerk user`)
      
      // Get owner details from HubSpot
      const owner = await this.makeRequest<{
        id: string
        email: string
        firstName: string
        lastName: string
      }>(`/crm/v3/owners/${hubspotOwnerId}`)

      if (!owner?.email) {
        this.log('warn', `No email found for HubSpot owner ${hubspotOwnerId}`)
        return
      }

      const supabase = await this.getSupabase()

      // Find user by email in users table
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, clerk_id, email')
        .eq('email', owner.email)
        .single()

      if (userError) {
        this.log('error', `Error finding user with email ${owner.email}`, userError)
        return
      }

      if (!user) {
        this.log('warn', `No user found with email ${owner.email}`)
        return
      }

      // Update user with HubSpot owner ID
      const { error: updateError } = await supabase
        .from('users')
        .update({ hubspot_owner_id: hubspotOwnerId })
        .eq('id', user.id)

      if (updateError) {
        this.log('error', `Failed to update user ${user.id} with HubSpot owner ID`, updateError)
        return
      }

      this.log('info', `✅ Successfully mapped HubSpot owner ${hubspotOwnerId} to user ${user.id}`)
    } catch (error) {
      this.log('error', `Failed to map HubSpot owner ${hubspotOwnerId}`, error)
    }
  }

  async syncDeals(limit?: number, offset?: number): Promise<number> {
    const startTime = Date.now()
    let totalDeals = 0
    let processedDeals = 0
    let after: string | undefined
    const batchSize = 100 // Process 100 deals at a time
    const errors: string[] = []

    try {
      // Get total count first
      const countResponse = await this.makeRequest<{
        total: number
      }>('/crm/v3/objects/deals', { count: true })
      totalDeals = limit ? Math.min(limit, countResponse.total) : countResponse.total

      this.log('info', `🤝 Starting deals sync - Total deals: ${totalDeals}`, {
        limit: limit || 'unlimited',
        offset: offset || 'none'
      })

      // Emit initial progress
      this.emitProgress('deals', {
        total: totalDeals,
        processed: 0,
        phase: 'starting',
        startTime
      })

    const properties = [
      'dealname', 'dealstage', 'amount', 'closedate', 'createdate',
      'pipeline', 'dealtype', 'description', 'hubspot_owner_id'
    ]

      while (true) {
        if (limit && processedDeals >= limit) break

        // Fetch batch of deals
        const deals = await this.makeRequest<{
          results: HubSpotDeal[]
          paging?: { next?: { after: string } }
        }>('/crm/v3/objects/deals', {
          limit: batchSize,
      properties,
          after
        })

        if (!deals.results?.length) {
          this.log('info', '✅ No more deals to process')
          break
        }

        this.log('info', `📦 Processing batch of ${deals.results.length} deals`, {
          processedSoFar: processedDeals,
          remaining: totalDeals - processedDeals
        })

        const supabase = await this.getSupabase()
        
        // Process deals in batch
        const batch = deals.results.map(deal => {
        const props = deal.properties
        const dealStage = props.dealstage || ''

          return {
          hubspot_deal_id: deal.id,
          hubspot_raw_data: deal,
          deal_name: props.dealname || 'Unnamed Deal',
          deal_stage: dealStage,
          deal_value: this.parseDecimal(props.amount),
          currency: 'USD',
          close_date: this.parseDate(props.closedate),
            is_closed: ['closedwon', 'closedlost'].includes(dealStage.toLowerCase().replace('-', '')),
            is_closed_won: dealStage.toLowerCase().replace('-', '') === 'closedwon',
          embedding_text: [props.dealname, dealStage, props.amount]
            .filter(Boolean).join(' '),
            hubspot_owner_id: props.hubspot_owner_id,
          hubspot_synced_at: new Date().toISOString()
        }
        })

        // Upload batch to Supabase
        const { data, error } = await supabase
          .from('deals')
          .upsert(batch, {
            onConflict: 'hubspot_deal_id',
            ignoreDuplicates: false
          })

        if (error) {
          const errorMsg = `Failed to insert deals batch: ${error.message}`
          this.log('error', '❌ Database error', {
            error,
            batchSize: batch.length,
            firstDealId: batch[0]?.hubspot_deal_id,
            code: error.code,
            details: error.details
          })
          errors.push(errorMsg)
          
          // Try inserting one by one to identify problematic records
          for (const deal of batch) {
            try {
              const { error: singleError } = await supabase
                .from('deals')
                .upsert(deal, {
                  onConflict: 'hubspot_deal_id',
                  ignoreDuplicates: false
                })
              
              if (singleError) {
                this.log('error', `❌ Failed to insert single deal ${deal.hubspot_deal_id}`, {
                  error: singleError,
                  deal
                })
              } else {
                processedDeals++
              }
            } catch (e) {
              this.log('error', `❌ Exception inserting deal ${deal.hubspot_deal_id}`, {
                error: e,
                deal
              })
            }
          }
        } else {
          processedDeals += batch.length
          
          // Map owners in parallel after successful insert
          await Promise.all(
            deals.results
              .filter(deal => deal.properties.hubspot_owner_id)
              .map(deal => this.mapHubSpotOwnerToClerk(deal.properties.hubspot_owner_id!))
          )
        }

        // Emit progress
        this.emitProgress('deals', {
          total: totalDeals,
          processed: processedDeals,
          phase: 'processing',
          startTime,
          errors: errors.length
        })

        // Check if we have more pages
        if (!deals.paging?.next?.after) {
          break
        }
        after = deals.paging.next.after

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, this.requestDelay))
      }

      // Emit completion
      this.emitProgress('deals', {
        total: totalDeals,
        processed: processedDeals,
        phase: 'complete',
        startTime,
        endTime: Date.now(),
        errors: errors.length
      })

      const duration = (Date.now() - startTime) / 1000
      this.log('info', `✅ Deals sync completed`, {
        processedDeals,
        errors: errors.length,
        duration: `${duration.toFixed(2)}s`
      })

      if (errors.length > 0) {
        this.log('warn', `⚠️ Sync completed with errors`, {
          errorCount: errors.length,
          errors
        })
      }

      return processedDeals
      } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      this.log('error', '❌ Deals sync failed', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : error,
        processedDeals,
        duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
        })
      throw new Error(`Deals sync failed: ${errorMsg}`)
      }
  }

  async syncDealEngagements(dealId: string, userId: string): Promise<number> {
    this.log('info', `🤝 Starting engagements sync for deal ${dealId}`)
    
    // Get user's HubSpot owner ID for access control
    const supabase = await this.getSupabase()
    const { data: user } = await supabase.from('users').select('hubspot_owner_id, email').eq('clerk_id', userId).single()

    // First verify the user owns this deal or has access
    const { data: userDeals } = await supabase.from('deals').select('id, hubspot_deal_id, hubspot_owner_id').eq('id', dealId).single()

    if (!userDeals) {
      throw new Error('Deal not found')
    }

    // Check if user has access to this deal using the same logic as getUserDeals
    const hasAccess = user?.hubspot_owner_id 
      ? (userDeals.hubspot_owner_id === user.hubspot_owner_id || userDeals.hubspot_owner_id === null)
      : (userDeals.hubspot_owner_id === null)

    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to sync engagements for this deal')
    }

    // Get engagements associated with this deal from HubSpot
    const engagements = await this.fetchDealEngagements(userDeals.hubspot_deal_id)

    let imported = 0
    const errors: string[] = []

    for (const engagement of engagements) {
      try {
        const engagementData = {
          deal_id: dealId,
          user_id: userId,
          hubspot_engagement_id: engagement.id,
          engagement_type: engagement.type,
          hubspot_raw_data: engagement,
          subject: engagement.properties.hs_subject,
          body: engagement.properties.hs_body_preview,
          activity_type: engagement.properties.hs_activity_type,
          timestamp: this.parseDate(engagement.properties.hs_timestamp),
          embedding_text: [
            engagement.properties.hs_subject,
            engagement.properties.hs_body_preview
          ].filter(Boolean).join(' '),
          hubspot_synced_at: new Date().toISOString()
        }

        const client = await this.getSupabase()
        await client.from('deal_engagements').insert(engagementData)
        imported++
      } catch (error) {
        const errorMsg = `Error importing engagement ${engagement.id}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
        this.log('error', errorMsg, { 
          engagementId: engagement.id, 
          engagementType: engagement.type,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : error
        })
        errors.push(errorMsg)
      }
    }

    this.log('info', `✅ Imported ${imported} engagements for deal ${dealId}`)
    return imported
  }

  private async fetchDealEngagements(hubspotDealId: string): Promise<HubSpotEngagement[]> {
    // Get all engagements associated with this deal
    const engagementTypes = ['notes', 'emails', 'calls', 'meetings', 'tasks']
    const allEngagements: HubSpotEngagement[] = []

    for (const type of engagementTypes) {
      try {
        const associations = await this.makeRequest<{
          results: Array<{ toObjectId: string }>
        }>(`/crm/v4/objects/deals/${hubspotDealId}/associations/${type}`)

        for (const assoc of associations.results || []) {
          const engagement = await this.makeRequest<HubSpotEngagement>(
            `/crm/v3/objects/${type}/${assoc.toObjectId}`
          )
          
          allEngagements.push({
            ...engagement,
            type: type.slice(0, -1).toUpperCase() as any // Remove 's' and uppercase
          })
        }
      } catch (error) {
        this.log('error', `Error fetching ${type} for deal ${hubspotDealId}`, {
          dealId: hubspotDealId,
          engagementType: type,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : error
        })
      }
    }

    return allEngagements
  }

  async linkAssociations(): Promise<void> {
    console.log('🔗 [HubSpot] Starting association linking process...')
    const startTime = Date.now()
    this.log('info', '🔗 Linking HubSpot associations...')
    
    let linkedCount = 0
    const errors: string[] = []
    const batchSize = 50 // Reduced batch size to avoid timeouts
    
    try {
      // Get Supabase client once
      const supabase = await this.getSupabase()
      
      // Process each association type
      for (const assocType of associationTypes) {
        console.log(`\n🔗 [HubSpot] Processing ${assocType.from} to ${assocType.to} associations...`)
        
        // Get all objects of the 'from' type
        const hubspotIdField = getHubspotIdField(assocType.from)
        let allFromObjects: any[] = []
        let page = 0
        const pageSize = 1000

        while (true) {
          const { data: fromObjects, error: fromError } = await supabase
            .from(assocType.from)
            .select(`id, ${hubspotIdField}`)
            .not(hubspotIdField, 'is', null)
            .range(page * pageSize, (page + 1) * pageSize - 1)

          if (fromError) {
            this.log('error', `Failed to fetch ${assocType.from}`, { error: fromError })
            break
          }

          if (!fromObjects?.length) {
            break
          }

          allFromObjects = [...allFromObjects, ...fromObjects]
          page++
        }

        if (!allFromObjects.length) {
          this.log('info', `No ${assocType.from} found to process`)
          continue
        }

        console.log(`📊 [HubSpot] Found ${allFromObjects.length} ${assocType.from} to process`)
        
        // Process in batches
        for (let i = 0; i < allFromObjects.length; i += batchSize) {
          const batch = allFromObjects.slice(i, i + batchSize)
          const batchAssociations = []

          for (const fromObj of batch) {
            if (!fromObj || typeof fromObj !== 'object') continue

            // Cast to a simple type with just the fields we need
            const typedObj = fromObj as { id: string | number; [key: string]: any }
            const hubspotFromId = typedObj[hubspotIdField]
            if (!hubspotFromId) continue

        try {
          // Add delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, this.requestDelay))

              // Fetch associations from HubSpot
          const associations = await this.makeRequest<{
                results: Array<{ toObjectId: string; associationTypes: Array<{ typeId: number; label: string; category: string }> }>
              }>(`/crm/v4/objects/${assocType.from}/${hubspotFromId}/associations/${assocType.to}`)

              if (!associations.results?.length) continue

              this.log('info', `Found ${associations.results.length} associations for ${assocType.from} ${hubspotFromId}`)

              for (const association of associations.results) {
                const hubspotToId = association.toObjectId
                const toObjectType = assocType.to === 'companies' ? 'company' : assocType.to.slice(0, -1) // Special case for companies
                const fromObjectType = assocType.from === 'companies' ? 'company' : assocType.from.slice(0, -1) // Special case for companies
                
                // Find the target object in our database
                const { data: toObject, error: toError } = await supabase
                  .from(assocType.to)
              .select('id')
                  .eq(getHubspotIdField(assocType.to), hubspotToId)
              .single()

                if (toError && toError.code !== 'PGRST116') { // Ignore not found error
                  this.log('error', `Failed to find ${toObjectType} with HubSpot ID ${hubspotToId}`, { error: toError })
                  continue
                }

                if (toObject) {
                  const assocType = association.associationTypes?.[0]
                  batchAssociations.push({
                    from_object_type: fromObjectType,
                    from_object_id: String(typedObj.id),
                    from_hubspot_id: hubspotFromId,
                    to_object_type: toObjectType,
                    to_object_id: String(toObject.id),
                    to_hubspot_id: hubspotToId,
                    association_type: assocType?.label || 'default',
                    association_type_id: assocType?.typeId,
                    association_category: assocType?.category || 'HUBSPOT_DEFINED',
                    hubspot_synced_at: new Date().toISOString()
                  })
            }
          }
        } catch (error) {
              const errorMsg = `Failed to process associations for ${assocType.from} ${hubspotFromId}: ${error instanceof Error ? error.message : String(error)}`
              this.log('error', errorMsg, { error })
          errors.push(errorMsg)
        }
      }

          // Upload batch to Supabase
          if (batchAssociations.length > 0) {
            try {
              const { error: batchError } = await supabase
                .from('hubspot_associations')
                .upsert(batchAssociations, {
                  onConflict: 'from_hubspot_id,to_hubspot_id,association_type',
                  ignoreDuplicates: false
                })

              if (batchError) {
                const errorMsg = `Failed to store batch of ${batchAssociations.length} associations: ${batchError.message}`
                this.log('error', errorMsg, { error: batchError })
                errors.push(errorMsg)

                // Try one by one
                for (const assoc of batchAssociations) {
                  try {
                    const { error: singleError } = await supabase
                .from('hubspot_associations')
                      .upsert(assoc, {
                        onConflict: 'from_hubspot_id,to_hubspot_id,association_type',
                        ignoreDuplicates: false
                      })

                    if (singleError) {
                      const singleErrorMsg = `Failed to store single association: ${singleError.message}`
                      this.log('error', singleErrorMsg, { error: singleError, association: assoc })
                      errors.push(singleErrorMsg)
              } else {
                linkedCount++
                    }
                  } catch (e) {
                    const catchErrorMsg = `Exception storing single association: ${e instanceof Error ? e.message : String(e)}`
                    this.log('error', catchErrorMsg, { error: e })
                    errors.push(catchErrorMsg)
                  }
                }
              } else {
                linkedCount += batchAssociations.length
          }
        } catch (error) {
              const batchErrorMsg = `Exception storing batch of ${batchAssociations.length} associations: ${error instanceof Error ? error.message : String(error)}`
              this.log('error', batchErrorMsg, { error })
              errors.push(batchErrorMsg)
            }
          }
        }
      }

      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)
      
      this.log('info', `✅ Association linking complete`, {
        linkedCount,
        errors: errors.length,
        duration: `${duration}s`
      })

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.log('error', '❌ Association linking failed', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
      })
      throw new Error(`Association linking failed: ${errorMsg}`)
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRequest('/crm/v3/objects/companies', { limit: 1 })
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  private async getAssociationCounts(): Promise<AssociationCounts> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('hubspot_associations')
      .select('from_object_type, to_object_type')

    if (error) {
      throw new Error(`Failed to get association counts: ${error.message}`)
    }

    return {
      total: data?.length || 0,
      contactToCompany: data?.filter(a => 
        a.from_object_type === 'contact' && a.to_object_type === 'company'
      ).length || 0,
      dealToCompany: data?.filter(a => 
        a.from_object_type === 'deal' && a.to_object_type === 'company'
      ).length || 0,
      contactToDeal: data?.filter(a => 
        a.from_object_type === 'contact' && a.to_object_type === 'deal'
      ).length || 0
    }
  }

  async getStats(): Promise<Record<string, number>> {
    const supabase = await this.getSupabase()
    const [companies, contacts, deals, engagements] = await Promise.all([
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('deals').select('*', { count: 'exact', head: true }),
      supabase.from('deal_engagements').select('*', { count: 'exact', head: true })
    ])

    return {
      companies: companies.count || 0,
      contacts: contacts.count || 0,
      deals: deals.count || 0,
      engagements: engagements.count || 0
    }
  }

  async getUserDeals(userId: string): Promise<any[]> {
    const supabase = await this.getSupabase()
    const { data: user } = await supabase
      .from('users')
      .select('hubspot_owner_id, email')
      .eq('clerk_id', userId)
      .single()

    this.log('info', `🔍 Finding deals for user ${userId}`, {
      hubspotOwnerId: user?.hubspot_owner_id,
      userEmail: user?.email
    })

    let dealsQuery = supabase
      .from('deals')
      .select(`
        *,
        companies(name, domain),
        deal_engagements(count),
        hubspot_associations!inner(
          to_object_type,
          to_object_id,
          type
        )
      `)

    if (user?.hubspot_owner_id) {
      // If user has a HubSpot owner ID:
      // 1. Show deals they own
      // 2. Show unassigned deals
      // 3. Show deals where they are mentioned in engagements
      dealsQuery = dealsQuery.or(`
        hubspot_owner_id.eq.${user.hubspot_owner_id},
        hubspot_owner_id.is.null,
        id.in.(
          select deal_id from deal_engagements 
          where user_id = '${userId}'
        )
      `)
    } else {
      // If user has no HubSpot owner ID:
      // 1. Show unassigned deals
      // 2. Show deals where they are mentioned in engagements
      dealsQuery = dealsQuery.or(`
        hubspot_owner_id.is.null,
        id.in.(
          select deal_id from deal_engagements 
          where user_id = '${userId}'
        )
      `)
    }

    const { data } = await dealsQuery
    return data || []
  }

  async fetchDealOwners(): Promise<any[]> {
    this.log('info', '👥 Fetching deal owners from HubSpot...')
    const owners: any[] = []
    let after: string | undefined
    
    try {
      while (true) {
        const response = await this.makeRequest<{
          results: Array<{
            id: string
            properties: {
              email?: string
              firstname?: string
              lastname?: string
              jobtitle?: string
              teamid?: string
            }
            userId: string
          }>
          paging?: { next?: { after: string } }
        }>('/crm/v3/owners', {
          method: 'GET',
          params: {
            limit: 100,
            after
          }
        })

        if (!response.results?.length) break

        // Map owner data
        const mappedOwners = response.results.map(owner => ({
          hubspot_owner_id: owner.id,
          user_id: owner.userId,
          email: owner.properties.email,
          first_name: owner.properties.firstname,
          last_name: owner.properties.lastname,
          job_title: owner.properties.jobtitle,
          team_id: owner.properties.teamid,
          raw_data: owner,
          hubspot_synced_at: new Date().toISOString()
        }))

        owners.push(...mappedOwners)
        
        // Log progress
        this.log('info', `📊 Fetched ${owners.length} owners so far`)

        // Check for next page
        if (!response.paging?.next?.after) break
        after = response.paging.next.after

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, this.requestDelay))
      }

      // Store owners in database
      if (owners.length > 0) {
        const supabase = await this.getSupabase()
        const { error } = await supabase
          .from('hubspot_owners')
          .upsert(owners, {
            onConflict: 'hubspot_owner_id',
            ignoreDuplicates: false
          })

        if (error) {
          throw new Error(`Failed to store owners: ${error.message}`)
        }
      }

      this.log('info', `✅ Successfully fetched and stored ${owners.length} owners`)
      return owners
    } catch (error) {
      const errorMsg = `Failed to fetch owners: ${error instanceof Error ? error.message : String(error)}`
      this.log('error', errorMsg, { error })
      throw new Error(errorMsg)
    }
  }

  async fetchPaginatedDeals(limit: number = 100, after?: string) {
    try {
      const response = await this.makeRequest<{
        results: Array<{
          id: string
          properties: {
            dealname: string
            dealstage: string
            amount: string
            closedate: string
            pipeline: string
            hubspot_owner_id: string
            createdate: string
          }
          associations?: {
            companies?: Array<{ id: string }>
          }
        }>
        paging?: { next?: { after: string }; total: number }
      }>('/crm/v3/objects/deals', {
        method: 'GET',
        params: {
          limit,
          after,
          properties: [
            'dealname',
            'dealstage',
            'amount',
            'closedate',
            'pipeline',
            'hubspot_owner_id',
            'createdate'
          ],
          associations: ['companies']
        }
      })

      return {
        deals: response.results.map(deal => ({
          id: deal.id,
          name: deal.properties.dealname,
          stage: deal.properties.dealstage,
          value: this.parseDecimal(deal.properties.amount),
          closeDate: deal.properties.closedate,
          pipeline: deal.properties.pipeline,
          ownerId: deal.properties.hubspot_owner_id,
          createDate: deal.properties.createdate,
          companyId: deal.associations?.companies?.[0]?.id
        })),
        pagination: {
          nextCursor: response.paging?.next?.after,
          total: response.paging?.total || 0
        }
      }
    } catch (error) {
      this.log('error', '❌ Error fetching paginated deals:', error)
      throw error
    }
  }

  async fetchPaginatedContacts(limit: number = 100, after?: string) {
    try {
      const response = await this.makeRequest<{
        results: Array<{
          id: string
          properties: {
            firstname: string
            lastname: string
            email: string
            phone: string
            jobtitle: string
            company: string
            createdate: string
          }
          associations?: {
            companies?: Array<{ id: string }>
          }
        }>
        paging?: { next?: { after: string }; total: number }
      }>('/crm/v3/objects/contacts', {
        method: 'GET',
        params: {
          limit,
          after,
          properties: [
            'firstname',
            'lastname',
            'email',
            'phone',
            'jobtitle',
            'company',
            'createdate'
          ],
          associations: ['companies']
        }
      })

      return {
        contacts: response.results.map(contact => ({
          id: contact.id,
          firstName: contact.properties.firstname,
          lastName: contact.properties.lastname,
          email: contact.properties.email,
          phone: contact.properties.phone,
          jobTitle: contact.properties.jobtitle,
          company: contact.properties.company,
          createDate: contact.properties.createdate,
          companyId: contact.associations?.companies?.[0]?.id
        })),
        pagination: {
          nextCursor: response.paging?.next?.after,
          total: response.paging?.total || 0
        }
      }
    } catch (error) {
      this.log('error', '❌ Error fetching paginated contacts:', error)
      throw error
    }
  }

  async fetchPaginatedCompanies(limit: number = 100, after?: string) {
    try {
      const response = await this.makeRequest<{
        results: Array<{
          id: string
          properties: {
            name: string
            domain: string
            website: string
            industry: string
            createdate: string
            description: string
          }
        }>
        paging?: { next?: { after: string }; total: number }
      }>('/crm/v3/objects/companies', {
        method: 'GET',
        params: {
          limit,
          after,
          properties: [
            'name',
            'domain',
            'website',
            'industry',
            'createdate',
            'description'
          ]
        }
      })

      return {
        companies: response.results.map(company => ({
          id: company.id,
          name: company.properties.name,
          domain: company.properties.domain,
          website: company.properties.website,
          industry: company.properties.industry,
          createDate: company.properties.createdate,
          description: company.properties.description
        })),
        pagination: {
          nextCursor: response.paging?.next?.after,
          total: response.paging?.total || 0
        }
      }
    } catch (error) {
      this.log('error', '❌ Error fetching paginated companies:', error)
      throw error
    }
  }
} 