import { clerkClient } from '@clerk/nextjs/server'
import { WebClient } from '@slack/web-api'

export class SlackAuthHelper {
  private static async getOAuthToken(userId: string, provider: 'oauth_slack' = 'oauth_slack') {
    try {
      const clerk = await clerkClient()
      const { data: oauthTokens } = await clerk.users.getUserOauthAccessToken(userId, provider)
      
      if (!oauthTokens || oauthTokens.length === 0) {
        throw new Error(`No ${provider} token found for user ${userId}`)
      }

      const token = oauthTokens[0]
      if (!token?.token) {
        throw new Error(`Invalid ${provider} token for user ${userId}`)
      }

      return token.token
    } catch (error) {
      console.error(`Error getting OAuth token for user ${userId}:`, error)
      throw error
    }
  }

  static async createSlackClient(userId: string) {
    const accessToken = await this.getOAuthToken(userId)
    return new WebClient(accessToken)
  }
} 