import { WebClient } from '@slack/web-api'

export class SlackSyncService {
  private client: WebClient
  private userId: string
  private organizationId: string

  constructor(userId: string, organizationId: string) {
    this.userId = userId
    this.organizationId = organizationId
    this.client = new WebClient() // Will be initialized in init()
  }

  async init() {
    try {
      const response = await fetch('/api/slack/auth')
      if (!response.ok) {
        throw new Error('Failed to initialize Slack client')
      }
      const data = await response.json()
      this.client = new WebClient(data.token)
      return data
    } catch (error) {
      console.error('Error initializing Slack client:', error)
      throw error
    }
  }

  async syncChannels() {
    try {
      await this.init()
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel'
      })
      return result.channels || []
    } catch (error) {
      console.error('Error syncing channels:', error)
      throw error
    }
  }

  async syncChannelMessages(channelId: string) {
    try {
      await this.init()
      const result = await this.client.conversations.history({
        channel: channelId,
        limit: 100
      })
      return result.messages || []
    } catch (error) {
      console.error('Error syncing channel messages:', error)
      throw error
    }
  }
} 