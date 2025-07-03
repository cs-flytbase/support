// lib/services/gmail-sync.ts
import { GoogleAuthHelper } from './google-auth'
import { syncHelpers } from './sync-helpers'
import { gmail_v1 } from 'googleapis'

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
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysBack)
      
      // Query for ALL messages (inbox, sent, drafts, etc.)
      const query = `after:${Math.floor(cutoffDate.getTime() / 1000)}`
      
      let allMessages: any[] = []
      let pageToken: string | undefined
      let totalProcessed = 0
      
      // Fetch all message IDs
      do {
        await GoogleAuthHelper.checkRateLimit(this.userId, 250)
        
        const listResponse = await GoogleAuthHelper.withRetry(async () => {
          return await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: 500,
            pageToken,
            includeSpamTrash: false // Exclude spam/trash
          })
        })
        
        const messages = listResponse.data.messages || []
        allMessages.push(...messages)
        pageToken = listResponse.data.nextPageToken || undefined
        
        console.log(`Fetched ${messages.length} message IDs, total: ${allMessages.length}`)
        
      } while (pageToken && allMessages.length < 50000) // Reasonable limit
      
      console.log(`Found ${allMessages.length} messages to sync`)
      
      // Process messages in batches
      const batchSize = 25 // Smaller batches for stability
      for (let i = 0; i < allMessages.length; i += batchSize) {
        const batch = allMessages.slice(i, i + batchSize)
        const processed = await this.processBatch(gmail, batch)
        totalProcessed += processed
        
        console.log(`Processed ${totalProcessed}/${allMessages.length} messages`)
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      // Get current historyId for future incremental syncs
      const profileResponse = await gmail.users.getProfile({ userId: 'me' })
      const historyId = profileResponse.data.historyId
      
      // Update sync metadata
      await this.updateSyncMetadata('full', { 
        last_sync_type: 'full',
        historyId: historyId,
        messages_synced: totalProcessed,
        sync_completed_at: new Date().toISOString()
      })
      
      console.log(`Full Gmail sync completed: ${totalProcessed} messages`)
      return { success: true, messagesSynced: totalProcessed }
      
    } catch (error) {
      console.error('Gmail full sync failed:', error)
      throw error
    }
  }

  // Incremental sync using historyId
  async performIncrementalSync() {
    console.log(`Starting incremental Gmail sync for user ${this.userId}`)
    
    try {
      const integration = await syncHelpers.getUserIntegrations(this.dbUserId, 'gmail')
      if (!integration || integration.length === 0) {
        console.log('No Gmail integration found, performing full sync')
        return await this.performFullSync()
      }
      
      const metadata = integration[0].metadata || {}
      const lastHistoryId = metadata.historyId
      
      if (!lastHistoryId) {
        console.log('No historyId found, performing full sync')
        return await this.performFullSync()
      }
      
      const gmail = await GoogleAuthHelper.createGmailClient(this.userId)
      
      // Get history since last sync
      const historyResponse = await GoogleAuthHelper.withRetry(async () => {
        return await gmail.users.history.list({
          userId: 'me',
          startHistoryId: lastHistoryId,
          historyTypes: ['messageAdded', 'messageDeleted'],
          maxResults: 500
        })
      })
      
      const history = historyResponse.data.history || []
      const newHistoryId = historyResponse.data.historyId
      
      console.log(`Found ${history.length} history records`)
      
      let messagesProcessed = 0
      
      // Process history entries
      for (const historyEntry of history) {
        // Handle new messages
        if (historyEntry.messagesAdded) {
          const messageIds = historyEntry.messagesAdded
            .filter(m => m.message?.id)
            .map(m => ({ id: m.message!.id }))
          
          const processed = await this.processBatch(gmail, messageIds as any[])
          messagesProcessed += processed
        }
        
        // Handle deleted messages
        if (historyEntry.messagesDeleted) {
          for (const deleted of historyEntry.messagesDeleted) {
            if (deleted.message?.id) {
              await syncHelpers.markEmailDeleted(deleted.message.id)
            }
          }
        }
      }
      
      // Update sync metadata with new historyId
      await this.updateSyncMetadata('incremental', {
        last_sync_type: 'incremental',
        historyId: newHistoryId,
        messages_processed: messagesProcessed,
        sync_completed_at: new Date().toISOString()
      })
      
      console.log(`Incremental Gmail sync completed: ${messagesProcessed} messages processed`)
      return { success: true, messagesProcessed }
      
    } catch (error) {
      console.error('Gmail incremental sync failed:', error)
      throw error
    }
  }

  private async processBatch(gmail: gmail_v1.Gmail, messageBatch: { id?: string }[]) {
    const emailsToInsert: any[] = []
    let processedCount = 0
    
    for (const msg of messageBatch) {
      if (!msg.id) continue
      
      try {
        // Check if we already have this message (duplicate prevention)
        if (await syncHelpers.emailExists(msg.id)) {
          processedCount++
          continue
        }
        
        await GoogleAuthHelper.checkRateLimit(this.userId, 250)
        
        // Fetch full message details
        const messageResponse = await GoogleAuthHelper.withRetry(async () => {
          return await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full'
          })
        })
        
        const message = messageResponse.data
        const emailData = await this.transformGmailMessage(message)
        
        if (emailData) {
          emailsToInsert.push(emailData)
          processedCount++
        }
        
      } catch (error) {
        console.error(`Error processing message ${msg.id}:`, error)
        // Continue with other messages
      }
    }
    
    // Batch insert emails
    if (emailsToInsert.length > 0) {
      await syncHelpers.batchInsertEmails(emailsToInsert)
      console.log(`Inserted ${emailsToInsert.length} new emails`)
    }
    
    return processedCount
  }

  private async transformGmailMessage(message: gmail_v1.Schema$Message) {
    if (!message.id) return null
    
    const headers = message.payload?.headers || []
    const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || ''
    
    const subject = getHeader('Subject')
    const fromHeader = getHeader('From')
    const toHeader = getHeader('To')
    const ccHeader = getHeader('Cc')
    const bccHeader = getHeader('Bcc')
    const dateHeader = getHeader('Date')
    
    // Parse sender
    const senderMatch = fromHeader.match(/^(.*?)\s*<(.+)>$/) || [null, fromHeader, fromHeader]
    const senderName = senderMatch[1]?.replace(/"/g, '').trim() || ''
    const senderEmail = senderMatch[2] || fromHeader
    
    // Parse all recipients
    const allRecipients = [toHeader, ccHeader, bccHeader]
      .filter(Boolean)
      .join(',')
      .split(',')
      .map(email => {
        const match = email.trim().match(/^(.*?)\s*<(.+)>$/) || [null, '', email.trim()]
        return {
          email: (match[2] || email.trim()).toLowerCase(),
          name: match[1]?.replace(/"/g, '').trim() || ''
        }
      })
      .filter(r => r.email && r.email.includes('@'))
    
    // Extract content
    let textContent = ''
    let htmlContent = ''
    
    const extractContent = (part: any) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        textContent = Buffer.from(part.body.data, 'base64').toString('utf-8')
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        htmlContent = Buffer.from(part.body.data, 'base64').toString('utf-8')
      } else if (part.parts) {
        part.parts.forEach(extractContent)
      }
    }
    
    if (message.payload?.parts) {
      message.payload.parts.forEach(extractContent)
    } else if (message.payload?.body?.data) {
      extractContent(message.payload)
    }
    
    const content = textContent || htmlContent.replace(/<[^>]*>/g, '')
    const snippet = message.snippet || content.substring(0, 200)
    
    // Try to link to customer by checking all emails involved
    const allEmails = [senderEmail, ...allRecipients.map(r => r.email)]
    const customerId = await this.findRelatedCustomer(allEmails)
    
    // Determine email type
    const labelIds = message.labelIds || []
    let emailType = 'received'
    if (labelIds.includes('SENT')) emailType = 'sent'
    if (labelIds.includes('DRAFT')) emailType = 'draft'
    
    // Parse date
    const receivedAt = dateHeader ? new Date(dateHeader) : new Date(parseInt(message.internalDate || '0'))
    
    // Generate embedding text for AI search
    const embeddingText = [
      subject,
      content.substring(0, 2000), // Limit content length
      senderEmail,
      senderName,
      allRecipients.map(r => `${r.name} ${r.email}`).join(' ')
    ].filter(Boolean).join(' ').substring(0, 8000)
    
    return {
      user_id: this.dbUserId,
      customer_id: customerId,
      google_message_id: message.id,
      thread_id: message.threadId,
      sender_email: senderEmail.toLowerCase(),
      sender_name: senderName,
      recipient_emails: JSON.stringify(allRecipients),
      subject: subject,
      content: content,
      html_content: htmlContent,
      snippet: snippet,
      is_read: !labelIds.includes('UNREAD'),
      is_important: labelIds.includes('IMPORTANT'),
      labels: JSON.stringify(labelIds),
      received_at: receivedAt.toISOString(),
      sent_at: emailType === 'sent' ? receivedAt.toISOString() : null,
      email_type: emailType,
      raw_email_data: JSON.stringify(message),
      embedding_text: embeddingText,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  private async findRelatedCustomer(emails: string[]): Promise<string | null> {
    for (const email of emails) {
      if (!email || !email.includes('@')) continue
      
      // First try to find by contact email
      const customerByContact = await syncHelpers.findCustomerByContactEmail(email)
      if (customerByContact) return customerByContact
      
      // Then try by domain
      const customerByDomain = await syncHelpers.findCustomerByEmailDomain(email)
      if (customerByDomain) return customerByDomain
    }
    
    return null
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
}