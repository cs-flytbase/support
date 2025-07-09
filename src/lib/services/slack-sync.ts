import { WebClient } from '@slack/web-api'
import { SlackAuthHelper } from './slack-auth'
import { syncHelpers } from './sync-helpers'
import { createClient } from '@supabase/supabase-js'

export class SlackSyncService {
  private userId: string
  private dbUserId: string

  constructor(userId: string, dbUserId: string) {
    this.userId = userId
    this.dbUserId = dbUserId
  }

  async getChannels() {
    try {
      const client = await SlackAuthHelper.createSlackClient(this.userId)
      const result = await client.conversations.list({
        exclude_archived: true,
        types: 'public_channel,private_channel'
      })

      return result.channels || []
    } catch (error) {
      console.error('Error fetching Slack channels:', error)
      throw error
    }
  }

  async getChannelMessages(channelId: string, oldestTimestamp?: string) {
    try {
      const client = await SlackAuthHelper.createSlackClient(this.userId)
      const result = await client.conversations.history({
        channel: channelId,
        oldest: oldestTimestamp,
        limit: 100
      })

      return result.messages || []
    } catch (error) {
      console.error('Error fetching channel messages:', error)
      throw error
    }
  }

  async syncChannels() {
    try {
      const channels = await this.getChannels()
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      for (const channel of channels) {
        const { error } = await supabase
          .from('slack_channels')
          .upsert({
            user_id: this.dbUserId,
            channel_id: channel.id,
            channel_name: channel.name,
            is_private: channel.is_private || false,
            metadata: {
              topic: channel.topic?.value,
              purpose: channel.purpose?.value,
              member_count: channel.num_members
            }
          }, {
            onConflict: 'channel_id'
          })

        if (error) {
          console.error('Error upserting channel:', error)
        }
      }

      // Update sync metadata
      await this.updateSyncMetadata('channels', {
        last_sync_at: new Date().toISOString(),
        channels_synced: channels.length
      })

      return channels
    } catch (error) {
      console.error('Error syncing channels:', error)
      throw error
    }
  }

  async syncChannelMessages(channelId: string) {
    try {
      const messages = await this.getChannelMessages(channelId)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      for (const message of messages) {
        const { error } = await supabase
          .from('slack_messages')
          .upsert({
            user_id: this.dbUserId,
            channel_id: channelId,
            slack_message_id: message.ts,
            user_slack_id: message.user,
            text: message.text,
            timestamp: new Date(Number(message.ts) * 1000).toISOString(),
            thread_ts: message.thread_ts,
            is_bot: message.bot_id ? true : false,
            metadata: {
              reactions: message.reactions,
              files: message.files,
              edited: message.edited
            }
          }, {
            onConflict: 'slack_message_id'
          })

        if (error) {
          console.error('Error upserting message:', error)
        }
      }

      // Update sync metadata
      await this.updateSyncMetadata('messages', {
        last_sync_at: new Date().toISOString(),
        messages_synced: messages.length,
        last_channel_synced: channelId
      })

      return messages
    } catch (error) {
      console.error('Error syncing channel messages:', error)
      throw error
    }
  }

  private async updateSyncMetadata(syncType: string, metadata: any) {
    try {
      await syncHelpers.updateIntegrationSync(this.dbUserId, 'slack', {
        ...metadata,
        sync_type: syncType
      })
    } catch (error) {
      console.error('Error updating sync metadata:', error)
    }
  }
} 