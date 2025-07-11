// lib/services/gmail-sync.ts
import { GoogleAuthHelper } from './google-auth'
import { syncHelpers } from './sync-helpers'
import { embeddingService } from './embedding-service'
import { gmail_v1, google } from 'googleapis'
import { supabaseClient } from '@/utils/supabase/client'

export class GmailSyncService {
  private userId: string
  private dbUserId: string
  
  constructor(userId: string, dbUserId: string) {
    this.userId = userId
    this.dbUserId = dbUserId
  }

  // Full sync - get ALL emails from the past year
  async performFullSync(daysBack: number = 365) {
    console.log(`Starting full Gmail sync for user ${this.userId} - last ${daysBack} days`)
    
    try {
      const gmail = await GoogleAuthHelper.createGmailClient(this.userId)
      
      // First sync recent emails (today and future)
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      console.log('First syncing recent emails...')
      await this.syncEmailsForTimeRange(gmail, startOfToday, null)
      
      // Then sync older emails
      const timeMin = new Date()
      timeMin.setDate(now.getDate() - daysBack)
      console.log('Now syncing older emails...')
      await this.syncEmailsForTimeRange(gmail, timeMin, startOfToday)
      
      console.log(`Full Gmail sync completed`)
      return { success: true }
      
    } catch (error) {
      console.error('Gmail full sync failed:', error)
      throw error
    }
  }

  // Incremental sync using history ID
  async performIncrementalSync() {
    console.log(`Starting incremental Gmail sync for user ${this.userId}`)
    
    try {
      const integration = await syncHelpers.getUserIntegrations(this.dbUserId, 'gmail')
      if (!integration || integration.length === 0) {
        console.log('No Gmail integration found, performing full sync')
        return await this.performFullSync()
      }
      
      const metadata = integration[0].metadata || {}
      const historyId = metadata.historyId
      
      if (!historyId) {
        console.log('No history ID found, performing full sync')
        return await this.performFullSync()
      }
      
      const gmail = await GoogleAuthHelper.createGmailClient(this.userId)
      let totalChangesProcessed = 0
      let pageToken: string | undefined
      let latestHistoryId = historyId
      
      do {
        await GoogleAuthHelper.checkRateLimit(this.userId, 250)
        
        const response = await gmail.users.history.list({
          userId: 'me',
          startHistoryId: historyId,
          maxResults: 100,
          pageToken
        })
        
        const history = response.data.history || []
        if (history.length === 0) break
        
        // Process each history record
        for (const record of history) {
          await this.processHistoryRecord(gmail, record)
          totalChangesProcessed++
          
          if (record.id) {
            latestHistoryId = record.id
          }
        }
        
        pageToken = response.data.nextPageToken || undefined
        console.log(`Processed ${totalChangesProcessed} changes so far`)
        
      } while (pageToken)
      
      // Update sync metadata with new history ID
      await this.updateSyncMetadata('incremental', {
        last_sync_type: 'incremental',
        changes_processed: totalChangesProcessed,
        historyId: latestHistoryId,
        sync_completed_at: new Date().toISOString()
      })
      
      console.log(`Incremental Gmail sync completed: ${totalChangesProcessed} changes`)
      return { success: true, changesProcessed: totalChangesProcessed }
      
    } catch (error) {
      console.error('Gmail incremental sync failed:', error)
      throw error
    }
  }

  // Handle real-time email updates
  async handleEmailUpdate(emailData: any) {
    console.log(`Processing email update for thread ${emailData.threadId}`)
    
    try {
      const gmail = await GoogleAuthHelper.createGmailClient(this.userId)
      
      // Get full email details
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: emailData.messageId
      })
      
      // Process and store email data
      const processedEmail = await this.transformEmailMessage(email.data)
      if (processedEmail) {
        await syncHelpers.batchInsertEmails([processedEmail])
        console.log(`Successfully processed email update for thread ${processedEmail.thread_id}`)
      }
      
    } catch (error) {
      console.error('Failed to process email update:', error)
      throw error
    }
  }

  private async processBatch(gmail: gmail_v1.Gmail, messages: gmail_v1.Schema$Message[]) {
    let processedCount = 0
    const batchSize = 10 // Gmail has stricter rate limits
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)
      
      for (const message of batch) {
        if (!message.id) continue
        
        try {
          await GoogleAuthHelper.checkRateLimit(this.userId, 250)
          
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          })
          
          const emailData = await this.transformEmailMessage(fullMessage.data)
          if (!emailData) continue
          
          // Store in database
          await syncHelpers.upsertEmail(emailData)
          processedCount++
          
          // Queue for embedding if has content
          if (emailData.embedding_text) {
            await embeddingService.queueForEmbedding('email', emailData.id, emailData.embedding_text)
          }
          
        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error)
          // Continue with other messages
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return processedCount
  }

  private async processHistoryRecord(gmail: gmail_v1.Gmail, record: gmail_v1.Schema$History) {
    // Handle added messages
    if (record.messagesAdded) {
      for (const added of record.messagesAdded) {
        if (!added.message?.id) continue
        
        try {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: added.message.id,
            format: 'full'
          })
          
          const emailData = await this.transformEmailMessage(fullMessage.data)
          if (emailData) {
            await syncHelpers.upsertEmail(emailData)
          }
        } catch (error) {
          console.error(`Error processing added message ${added.message.id}:`, error)
        }
      }
    }
    
    // Handle deleted messages
    if (record.messagesDeleted) {
      for (const deleted of record.messagesDeleted) {
        if (!deleted.message?.id) continue
        
        try {
          await syncHelpers.markEmailDeleted(deleted.message.id)
        } catch (error) {
          console.error(`Error processing deleted message ${deleted.message.id}:`, error)
        }
      }
    }
    
    // Handle label changes
    if (record.labelsAdded || record.labelsRemoved) {
      for (const change of [...(record.labelsAdded || []), ...(record.labelsRemoved || [])]) {
        if (!change.message?.id) continue
        
        try {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: change.message.id,
            format: 'full'
          })
          
          const emailData = await this.transformEmailMessage(fullMessage.data)
          if (emailData) {
            await syncHelpers.upsertEmail(emailData)
          }
        } catch (error) {
          console.error(`Error processing label change for message ${change.message.id}:`, error)
        }
      }
    }
  }

  private async transformEmailMessage(message: gmail_v1.Schema$Message) {
    if (!message.id || !message.payload) return null
    
    const headers = message.payload.headers || []
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(No subject)'
    const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || ''
    const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || ''
    const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value
    
    // Extract email addresses
    const fromEmail = this.extractEmail(from)
    const toEmails = this.extractEmails(to)
    
    // Get plain text content
    let textContent = ''
    let htmlContent = ''
    
    const processPart = (part: gmail_v1.Schema$MessagePart) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        textContent += Buffer.from(part.body.data, 'base64').toString()
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        htmlContent += Buffer.from(part.body.data, 'base64').toString()
      }
      
      if (part.parts) {
        part.parts.forEach(processPart)
      }
    }
    
    processPart(message.payload)
    
    // Try to link to customer
    const customerEmails = [fromEmail, ...toEmails].filter(Boolean)
    let customerId = null
    
    // Try each email to find a customer match
    for (const email of customerEmails) {
      if (!email) continue
      
      // First try to find by contact email
      customerId = await syncHelpers.findCustomerByContactEmail(email)
      if (customerId) break
      
      // Then try by domain
      customerId = await syncHelpers.findCustomerByEmailDomain(email)
      if (customerId) break
    }
    
    // Generate embedding text
    const embeddingText = [
      subject,
      textContent.substring(0, 1000),
      from,
      to
    ].filter(Boolean).join(' ').substring(0, 4000)
    
    return {
      id: message.id,
      user_id: this.dbUserId,
      customer_id: customerId,
      thread_id: message.threadId || null,
      message_id: message.id,
      subject: subject,
      sender_email: fromEmail,
      sender_name: this.extractName(from),
      recipient_emails: toEmails,
      cc_emails: this.extractEmails(headers.find(h => h.name?.toLowerCase() === 'cc')?.value || ''),
      bcc_emails: this.extractEmails(headers.find(h => h.name?.toLowerCase() === 'bcc')?.value || ''),
      received_at: date ? new Date(date).toISOString() : null,
      content: textContent,
      html_content: htmlContent,
      labels: message.labelIds || [],
      is_sent: (message.labelIds || []).includes('SENT'),
      is_draft: (message.labelIds || []).includes('DRAFT'),
      is_trash: (message.labelIds || []).includes('TRASH'),
      is_spam: (message.labelIds || []).includes('SPAM'),
      has_attachments: this.hasAttachments(message.payload),
      snippet: message.snippet || '',
      embedding_text: embeddingText,
      raw_headers: JSON.stringify(headers),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  private extractEmail(str: string): string {
    const match = str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    return match ? match[0].toLowerCase() : ''
  }

  private extractEmails(str: string): string[] {
    const matches = str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
    return matches.map(email => email.toLowerCase())
  }

  private extractName(str: string): string {
    const match = str.match(/^"?([^"<]+)"?\s*(?:<[^>]+>)?/)
    return match ? match[1].trim() : ''
  }

  private hasAttachments(payload: gmail_v1.Schema$MessagePart): boolean {
    const checkPart = (part: gmail_v1.Schema$MessagePart): boolean => {
      if (part.filename && part.filename.length > 0) return true
      if (part.parts) {
        return part.parts.some(checkPart)
      }
      return false
    }
    
    return checkPart(payload)
  }

  private async updateSyncMetadata(syncType: string, metadata: any) {
    try {
      await syncHelpers.updateIntegrationSync(this.dbUserId, 'gmail', {
        ...metadata,
        sync_type: syncType
      })
    } catch (error) {
      console.error('Error updating sync metadata:', error)
    }
  }

  private async syncEmailsForTimeRange(gmail: gmail_v1.Gmail, startTime: Date, endTime: Date | null) {
    let totalEmailsProcessed = 0
    let pageToken: string | undefined
    
    const timeQuery = endTime 
      ? `after:${Math.floor(startTime.getTime() / 1000)} before:${Math.floor(endTime.getTime() / 1000)}`
      : `after:${Math.floor(startTime.getTime() / 1000)}`
    
    do {
      await GoogleAuthHelper.checkRateLimit(this.userId, 250)
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 100,
        pageToken,
        q: timeQuery
      })
      
      const messages = response.data.messages || []
      if (messages.length === 0) break
      
      // Process messages in batches
      const processed = await this.processBatch(gmail, messages)
      totalEmailsProcessed += processed
      
      pageToken = response.data.nextPageToken || undefined
      console.log(`Processed ${totalEmailsProcessed} emails for time range`)
      
    } while (pageToken && totalEmailsProcessed < 10000) // Reasonable limit
    
    return totalEmailsProcessed
  }
}