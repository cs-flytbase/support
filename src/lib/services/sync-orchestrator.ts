import { GmailSyncService } from './gmail-sync'
import { CalendarSyncService } from './calendar-sync'
import { HubSpotSyncService } from './hubspot-sync'
import { supabaseClient } from '@/utils/supabase/client'

export class SyncOrchestrator {
  private gmailSync: GmailSyncService
  private calendarSync: CalendarSyncService
  private hubspotSync: HubSpotSyncService
  private userId: string
  private dbUserId: string

  constructor(userId: string, dbUserId: string) {
    this.userId = userId
    this.dbUserId = dbUserId
    this.gmailSync = new GmailSyncService(userId, dbUserId)
    this.calendarSync = new CalendarSyncService(userId, dbUserId)
    this.hubspotSync = new HubSpotSyncService()
  }

  // Full sync of all systems
  async performFullSync() {
    console.log(`Starting full sync for user ${this.userId}`)
    
    try {
      // Update sync status
      await this.updateSyncStatus('full', 'in_progress')

      // Sync Gmail
      await this.gmailSync.performFullSync()

      // Sync Calendar
      await this.calendarSync.performFullSync()

      // Sync HubSpot
      await this.hubspotSync.syncCompanies()
      await this.hubspotSync.syncContacts()
      await this.hubspotSync.syncDeals()

      // Link associations
      await this.hubspotSync.linkAssociations()

      // Update sync status
      await this.updateSyncStatus('full', 'success')
      console.log('Full sync completed successfully')
    } catch (error) {
      console.error('Full sync failed:', error)
      await this.updateSyncStatus('full', 'failed')
      throw error
    }
  }

  // Incremental sync of all systems
  async performIncrementalSync() {
    console.log(`Starting incremental sync for user ${this.userId}`)
    
    try {
      // Update sync status
      await this.updateSyncStatus('incremental', 'in_progress')

      // Sync Gmail
      await this.gmailSync.performIncrementalSync()

      // Sync Calendar
      await this.calendarSync.performIncrementalSync()

      // Sync HubSpot
      await this.hubspotSync.syncCompanies()
      await this.hubspotSync.syncContacts()
      await this.hubspotSync.syncDeals()

      // Link associations
      await this.hubspotSync.linkAssociations()

      // Update sync status
      await this.updateSyncStatus('incremental', 'success')
      console.log('Incremental sync completed successfully')
    } catch (error) {
      console.error('Incremental sync failed:', error)
      await this.updateSyncStatus('incremental', 'failed')
      throw error
    }
  }

  // Handle real-time email updates
  async handleEmailUpdate(emailData: any) {
    try {
      // Process in Gmail sync service
      await this.gmailSync.handleEmailUpdate(emailData)

      // Create engagement in HubSpot
      await this.hubspotSync.createEmailEngagement(emailData)
    } catch (error) {
      console.error('Failed to handle email update:', error)
      throw error
    }
  }

  // Handle real-time calendar event updates
  async handleEventUpdate(eventData: any) {
    try {
      // Process in Calendar sync service
      await this.calendarSync.handleEventUpdate(eventData)

      // Create engagement in HubSpot
      await this.hubspotSync.createMeetingEngagement(eventData)
    } catch (error) {
      console.error('Failed to handle event update:', error)
      throw error
    }
  }

  // Get sync status and statistics
  async getSyncStatus() {
    try {
      // Get last sync status
      const { data: syncStatus } = await supabaseClient
        .from('sync_metadata')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Get HubSpot stats
      const hubspotStats = await this.hubspotSync.getStats()

      return {
        lastSync: syncStatus,
        hubspotStats
      }
    } catch (error) {
      console.error('Failed to get sync status:', error)
      throw error
    }
  }

  // Helper method to update sync status
  private async updateSyncStatus(syncType: 'full' | 'incremental', status: 'success' | 'failed' | 'in_progress') {
    const { error } = await supabaseClient
      .from('sync_metadata')
      .insert({
        user_id: this.userId,
        sync_type: syncType,
        sync_status: status
      })

    if (error) throw error
  }
} 