'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  Mail, 
  Calendar, 
  Database,
  CheckCircle, 
  AlertCircle, 
  Clock,
  Activity,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useRealtimeEmbeddingQueue } from '@/hooks/useRealtimeEmbeddingQueue'
import { useRealtimeDataSync } from '@/hooks/useRealtimeDataSync'

export default function RealtimeDashboard() {
  const { stats: embeddingStats, isLoading: embeddingLoading, error: embeddingError } = useRealtimeEmbeddingQueue()
  const { stats: syncStats, isLoading: syncLoading, error: syncError, recentActivity } = useRealtimeDataSync()
  const [isSyncingData, setIsSyncingData] = useState(false)
  const [isProcessingEmbeddings, setIsProcessingEmbeddings] = useState(false)

  // Sync data without embeddings
  const syncDataOnly = async () => {
    setIsSyncingData(true)
    
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          syncType: 'incremental',
          skipEmbeddings: true 
        })
      })
      
      const result = await response.json()
      console.log('Sync result:', result)
      
    } catch (error) {
      console.error('Data sync failed:', error)
    } finally {
      setIsSyncingData(false)
    }
  }

  // Process embedding queue manually
  const processEmbeddings = async () => {
    setIsProcessingEmbeddings(true)
    
    try {
      const response = await fetch('/api/cron/process-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      console.log('Embedding processing result:', result)
      
    } catch (error) {
      console.error('Failed to process embeddings:', error)
    } finally {
      setIsProcessingEmbeddings(false)
    }
  }

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never'
    return date.toLocaleTimeString()
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never'
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-6 w-6" />
            Real-time Dashboard
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Wifi className="h-4 w-4 text-green-500" />
            Live updates from your database • Last updated: {formatTime(new Date())}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={syncDataOnly}
            disabled={isSyncingData || isProcessingEmbeddings}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncingData ? 'animate-spin' : ''}`} />
            Sync Data
          </Button>
          
          <Button
            onClick={processEmbeddings}
            disabled={isProcessingEmbeddings || isSyncingData}
            size="sm"
          >
            <Zap className={`w-4 h-4 mr-2 ${isProcessingEmbeddings ? 'animate-spin' : ''}`} />
            Process Queue
          </Button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Email Stats */}
        <Card className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              Emails
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            {syncLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : syncError ? (
              <div className="text-red-500 text-sm">{syncError}</div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">{syncStats.emails.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {syncStats.emails.todayCount} synced today
                </p>
                <p className="text-xs text-muted-foreground">
                  Last added: {formatTime(syncStats.emails.lastAdded)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar Stats */}
        <Card className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              Calendar Events
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            {syncLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : syncError ? (
              <div className="text-red-500 text-sm">{syncError}</div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">{syncStats.calendar.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {syncStats.calendar.todayCount} synced today
                </p>
                <p className="text-xs text-muted-foreground">
                  Last added: {formatTime(syncStats.calendar.lastAdded)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Embedding Queue Stats */}
        <Card className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              AI Queue
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            {embeddingLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : embeddingError ? (
              <div className="text-red-500 text-sm">{embeddingError}</div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">{embeddingStats.total.toLocaleString()}</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending:</span>
                    <Badge variant="outline" className="h-5 text-xs">
                      {embeddingStats.pending}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Done:</span>
                    <Badge variant="outline" className="h-5 text-xs">
                      {embeddingStats.completed}
                    </Badge>
                  </div>
                  {embeddingStats.processing > 0 && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">Processing:</span>
                      <Badge variant="outline" className="h-5 text-xs">
                        {embeddingStats.processing}
                      </Badge>
                    </div>
                  )}
                  {embeddingStats.failed > 0 && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-red-500">Failed:</span>
                      <Badge variant="destructive" className="h-5 text-xs">
                        {embeddingStats.failed}
                      </Badge>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated: {formatTime(embeddingStats.lastUpdated)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Live Activity Feed
          </CardTitle>
          <CardDescription>
            Real-time updates as data is synced to your database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No recent activity. Start a sync to see live updates!
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="text-sm p-2 rounded-md bg-muted/50 border-l-2 border-blue-500">
                  {activity}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Real-time connected</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Auto-refresh: {formatTime(new Date())}</span>
          </div>
        </div>
        <div className="text-right">
          <p>Database updates appear instantly</p>
          <p>No manual refresh needed</p>
        </div>
      </div>
    </div>
  )
} 