import { WebClient } from '@slack/web-api'

export class SlackSyncService {
  private token: string | null = null
  private userId: string
  private organizationId: string

  constructor(userId: string, organizationId: string) {
    this.userId = userId
    this.organizationId = organizationId
  }

  async init() {
    try {
      const response = await fetch('/api/slack/auth')
      if (!response.ok) {
        throw new Error('Failed to initialize Slack client')
      }
      const data = await response.json()
      this.token = data.token
      return data
    } catch (error) {
      console.error('Error initializing Slack client:', error)
      throw error
    }
  }

  async syncChannels() {
    try {
      await this.init()
      const response = await fetch('/api/slack/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'listChannels',
          params: {
            types: 'public_channel,private_channel'
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to sync channels')
      }
      
      const data = await response.json()
      return data.channels || []
    } catch (error) {
      console.error('Error syncing channels:', error)
      throw error
    }
  }

  async syncChannelMessages(channelId: string) {
    try {
      await this.init()
      const response = await fetch('/api/slack/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'getChannelHistory',
          params: {
            channelId,
            limit: 100
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to sync channel messages')
      }
      
      const data = await response.json()
      return data.messages || []
    } catch (error) {
      console.error('Error syncing channel messages:', error)
      throw error
    }
  }
} 