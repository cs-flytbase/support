// lib/services/google-auth.ts
import { clerkClient } from '@clerk/nextjs/server'
import { google } from 'googleapis'

export class GoogleAuthHelper {
  private static async getOAuthToken(userId: string, provider: 'oauth_google' = 'oauth_google') {
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

  static async createGoogleAuth(userId: string) {
    const accessToken = await this.getOAuthToken(userId)
    
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: accessToken
    })

    return oauth2Client
  }

  static async createGmailClient(userId: string) {
    const auth = await this.createGoogleAuth(userId)
    return google.gmail({ version: 'v1', auth })
  }

  static async createCalendarClient(userId: string) {
    const auth = await this.createGoogleAuth(userId)
    return google.calendar({ version: 'v3', auth })
  }

  // Helper to handle API errors and token refresh
  static async withRetry<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        lastError = error
        
        // Don't retry on auth errors - user needs to reconnect
        if (error.code === 401 || error.code === 403) {
          throw error
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          throw error
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        
        console.log(`Retrying API call (attempt ${attempt + 1}/${maxRetries})`)
      }
    }
    
    throw lastError
  }

  // Rate limiting helper
  private static rateLimiters = new Map<string, { requests: number, resetTime: number }>()

  static async checkRateLimit(userId: string, requestsPerMinute: number = 60) {
    const now = Date.now()
    const minuteMs = 60 * 1000
    const key = `${userId}_rate_limit`
    
    const current = this.rateLimiters.get(key)
    
    if (!current || now > current.resetTime) {
      this.rateLimiters.set(key, { requests: 1, resetTime: now + minuteMs })
      return true
    }
    
    if (current.requests >= requestsPerMinute) {
      const waitTime = current.resetTime - now
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.rateLimiters.set(key, { requests: 1, resetTime: now + minuteMs })
      return true
    }
    
    current.requests++
    return true
  }
}