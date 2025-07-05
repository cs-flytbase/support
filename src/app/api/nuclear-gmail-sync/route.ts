// NUCLEAR GMAIL SYNC - FETCHES EVERYTHING, NO EXCEPTIONS (FIXED)
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleAuthHelper } from '@/lib/services/google-auth'
import { syncHelpers } from '@/lib/services/sync-helpers'
import { embeddingService } from '@/lib/services/embedding-service'

export async function POST(request: NextRequest) {
  console.log('📧📧📧 NUCLEAR GMAIL SYNC INITIATED (INCREMENTAL SAVE VERSION) 📧📧📧')
  const startTime = Date.now()
  
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const enableEmbeddings = body.enableEmbeddings || false
    console.log(`🤖 Embeddings: ${enableEmbeddings ? 'ENABLED' : 'DISABLED'}`)

    // Get user
    let dbUser
    try {
      dbUser = await syncHelpers.getUserByClerkId(userId)
      console.log(`✅ Found existing user: ${dbUser.id}`)
    } catch (error) {
      console.log(`👤 User not found, creating new user for Clerk ID: ${userId}`)
      
      const { createClient } = require('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: userId,
          email: `${userId}@temp.placeholder`,
          full_name: 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating user:', createError)
        throw createError
      }
      
      dbUser = newUser
      console.log(`✅ Created new user: ${dbUser.id}`)
    }

    const gmail = await GoogleAuthHelper.createGmailClient(userId)
    console.log('✅ Gmail client ready')

    // Initialize Supabase client for incremental saves
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // INCREMENTAL APPROACH: Fetch small batches and save immediately
    let totalMessagesFetched = 0
    let totalMessagesSaved = 0
    let pageToken: string | undefined
    let chunkCount = 0
    const maxMessagesPerChunk = 200 // Smaller chunks for gentler processing

    console.log('🚀 STARTING INCREMENTAL GMAIL SYNC...')

    do {
      chunkCount++
      console.log(`\n📦 === CHUNK ${chunkCount} START ===`)
      
      // Step 1: Fetch a small batch of message IDs
      console.log(`   🔍 Fetching message IDs...`)
      const messagesResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: maxMessagesPerChunk,
        pageToken
        // NO query filters = EVERYTHING EVER!
      })
      
      const messageIds = messagesResponse.data.messages || []
      pageToken = messagesResponse.data.nextPageToken || undefined
      totalMessagesFetched += messageIds.length
      
      console.log(`   ✅ Fetched ${messageIds.length} message IDs (total: ${totalMessagesFetched})`)
      
      if (messageIds.length === 0) {
        console.log(`   ⚠️ No messages in this chunk, skipping...`)
        continue
      }

      // Step 2: Process this chunk to get full details
      console.log(`   🔄 Processing ${messageIds.length} messages...`)
      const batchSize = 25 // Smaller sub-batches for API calls
      const emailsToSave: any[] = []

      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize)
        console.log(`     📝 Processing sub-batch ${Math.ceil((i + 1) / batchSize)} (${batch.length} messages)...`)

        // Get full message details for this sub-batch
        const batchPromises = batch.map(async (msg: any) => {
          try {
            const fullMessage = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'full'
            })
            return fullMessage.data
          } catch (error) {
            console.warn(`     ⚠️ Failed to fetch message ${msg.id}:`, error)
            return null
          }
        })

        const fullMessages = await Promise.all(batchPromises)
        const validMessages = fullMessages.filter(msg => msg !== null)

        // Transform each message to database format
        for (const message of validMessages) {
          try {
            const headers = message.payload?.headers || []
            const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

            // Extract email content
            let textContent = ''
            let htmlContent = ''

            const extractContent = (part: any): void => {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                textContent += Buffer.from(part.body.data, 'base64').toString('utf-8')
              } else if (part.mimeType === 'text/html' && part.body?.data) {
                htmlContent += Buffer.from(part.body.data, 'base64').toString('utf-8')
              } else if (part.parts) {
                part.parts.forEach(extractContent)
              }
            }

            if (message.payload) {
              extractContent(message.payload)
            }

            // Get thread info
            const threadId = message.threadId
            const messageId = message.id
            const googleMessageId = messageId

            // Parse date
            const dateHeader = getHeader('Date')
            const receivedDate = dateHeader ? new Date(dateHeader) : new Date(parseInt(message.internalDate || '0'))

            // Build email data with only existing columns
            const emailData = {
              id: messageId,
              user_id: dbUser.id,
              google_message_id: googleMessageId,
              thread_id: threadId,
              subject: getHeader('Subject') || '(No Subject)',
              sender_email: getHeader('From') || '',
              sender_name: getHeader('From')?.split('<')[0]?.trim().replace(/"/g, '') || '',
              recipient_emails: [getHeader('To') || ''].filter(Boolean),
              cc_emails: getHeader('Cc') ? [getHeader('Cc')] : [],
              bcc_emails: [],
              content: textContent || htmlContent || '',
              html_content: htmlContent || '',
              received_at: receivedDate.toISOString(),
              labels: message.labelIds || [],
              is_read: !message.labelIds?.includes('UNREAD'),
              is_important: message.labelIds?.includes('IMPORTANT') || false,
              is_starred: message.labelIds?.includes('STARRED') || false,
              has_attachments: (message.payload?.parts || []).some((part: any) => 
                part.filename && part.filename.length > 0
              ),
              attachment_count: (message.payload?.parts || []).filter((part: any) => 
                part.filename && part.filename.length > 0
              ).length,
              snippet: message.snippet || '',
              customer_id: null,
              source: 'gmail',
              raw_headers: JSON.stringify(headers),
              embedding_text: `${getHeader('Subject') || ''} ${textContent || htmlContent || ''}`.trim(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            emailsToSave.push(emailData)

          } catch (error) {
            console.warn(`     ⚠️ Failed to process message:`, error)
          }
        }
      }

      console.log(`   ✅ Processed ${emailsToSave.length} emails for this chunk`)

      // Step 3: Save this chunk to database immediately
      if (emailsToSave.length > 0) {
        console.log(`   💾 Saving ${emailsToSave.length} emails to database...`)
        
        try {
          const { data: upsertedEmails, error: upsertError } = await supabase
            .from('emails')
            .upsert(emailsToSave, {
              onConflict: 'google_message_id',
              ignoreDuplicates: false
            })
            .select('id')

          if (upsertError) {
            console.error('   ❌ Email upsert failed:', upsertError)
            throw upsertError
          }

          const savedCount = upsertedEmails?.length || emailsToSave.length
          totalMessagesSaved += savedCount
          console.log(`   ✅ Saved ${savedCount} emails (total saved: ${totalMessagesSaved})`)

          // Queue for embeddings ONLY if enabled
          if (enableEmbeddings) {
            console.log(`   🤖 Queueing ${savedCount} emails for embedding...`)
            try {
              for (const email of emailsToSave) {
                if (email.embedding_text) {
                  await embeddingService.queueForEmbedding('email', email.id, email.embedding_text)
                }
              }
              console.log(`   ✅ Queued ${savedCount} emails for embedding`)
            } catch (embeddingError) {
              console.warn(`   ⚠️ Embedding queue failed (non-critical):`, embeddingError)
            }
          }

        } catch (error) {
          console.error(`   ❌ Database save failed for chunk ${chunkCount}:`, error)
          throw error
        }
      } else {
        console.log(`   ⚠️ No emails to save in this chunk`)
      }

      console.log(`📦 === CHUNK ${chunkCount} COMPLETE ===`)
      
      // Small delay between chunks to be gentle on the system
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } while (pageToken && totalMessagesFetched < 10000) // Reasonable safety limit

    const totalTime = Date.now() - startTime
    console.log(`\n📧📧📧 INCREMENTAL GMAIL SYNC COMPLETE! 📧📧📧`)
    console.log(`⏱️ Time: ${totalTime}ms`)
    console.log(`📥 Total chunks processed: ${chunkCount}`)
    console.log(`📥 Total messages fetched: ${totalMessagesFetched}`)
    console.log(`💾 Total emails saved: ${totalMessagesSaved}`)
    console.log(`🤖 Embeddings: ${enableEmbeddings ? 'ENABLED' : 'DISABLED'}`)

    return NextResponse.json({
      success: true,
      message: `INCREMENTAL GMAIL SYNC COMPLETE! Processed ${chunkCount} chunks, fetched ${totalMessagesFetched} messages, saved ${totalMessagesSaved}`,
      totalMessagesFetched: totalMessagesFetched,
      totalMessagesInDatabase: totalMessagesSaved,
      chunksProcessed: chunkCount,
      embeddingsEnabled: enableEmbeddings,
      timeMs: totalTime
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`📧 INCREMENTAL GMAIL SYNC FAILED:`, error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timeMs: totalTime
    }, { status: 500 })
  }
} 