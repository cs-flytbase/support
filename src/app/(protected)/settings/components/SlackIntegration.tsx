import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { SlackSyncService } from '@/lib/services/slack-sync'

export function SlackIntegration() {
  const { user } = useUser()
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<{
    lastSyncAt?: string
    channelsSynced?: number
    messagesSynced?: number
  }>({})

  useEffect(() => {
    const checkConnection = async () => {
      if (!user) return
      try {
        const tokens = await user.externalAccounts.find(
          account => account.provider === 'slack'
        )
        setIsConnected(!!tokens)
      } catch (error) {
        console.error('Error checking Slack connection:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkConnection()
  }, [user])

  const handleConnect = async () => {
    if (!user) return
    try {
      const redirectUrl = `${window.location.origin}/settings`
      window.location.href = `https://slack.com/oauth/v2/authorize?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}&scope=channels:read,channels:history,groups:read,groups:history,chat:write,users:read&redirect_uri=${encodeURIComponent(redirectUrl)}`
    } catch (error) {
      console.error('Error connecting to Slack:', error)
    }
  }

  const handleSync = async () => {
    if (!user) return
    try {
      setIsLoading(true)
      const slackService = new SlackSyncService(user.id, user.id)
      const channels = await slackService.syncChannels()
      
      // Sync messages for each channel
      let totalMessages = 0
      for (const channel of channels) {
        if (channel.id) {
          const messages = await slackService.syncChannelMessages(channel.id)
          totalMessages += messages.length
        }
      }

      setSyncStatus({
        lastSyncAt: new Date().toISOString(),
        channelsSynced: channels.length,
        messagesSynced: totalMessages
      })
    } catch (error) {
      console.error('Error syncing Slack data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Slack Integration</h3>
          <p className="text-sm text-gray-500">
            Connect your Slack workspace to sync channels and messages
          </p>
        </div>
        {!isLoading && (
          <Button
            onClick={isConnected ? handleSync : handleConnect}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : isConnected ? 'Sync Now' : 'Connect Slack'}
          </Button>
        )}
      </div>

      {isConnected && syncStatus.lastSyncAt && (
        <div className="mt-4 text-sm text-gray-500">
          <p>Last synced: {new Date(syncStatus.lastSyncAt).toLocaleString()}</p>
          <p>Channels synced: {syncStatus.channelsSynced}</p>
          <p>Messages synced: {syncStatus.messagesSynced}</p>
        </div>
      )}
    </Card>
  )
} 