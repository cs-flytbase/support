// components/SyncDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, Mail, Calendar, CheckCircle, AlertCircle } from 'lucide-react'

interface SyncResult {
  success: boolean
  message: string
  results?: {
    gmail: { success: boolean; error: string | null; data: any }
    calendar: { success: boolean; error: string | null; data: any }
  }
}

interface EmbeddingStats {
  pending: number
  processing: number
  completed: number
  failed: number
}

export default function SyncDashboard() {
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [embeddingStats, setEmbeddingStats] = useState<EmbeddingStats | null>(null)
  const [isProcessingEmbeddings, setIsProcessingEmbeddings] = useState(false)
  const [isSyncingData, setIsSyncingData] = useState(false)

  // Fetch embedding queue statistics
  const fetchEmbeddingStats = async () => {
    try {
      const response = await fetch('/api/sync/embeddings')
      const result = await response.json()
      if (result.success) {
        setEmbeddingStats(result.stats)
      }
    } catch (error) {
      console.error('Failed to fetch embedding stats:', error)
    }
  }

  // Sync data without embeddings
  const syncDataOnly = async () => {
    setIsSyncingData(true)
    setSyncResult(null)
    
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
      setSyncResult(result)
      setLastSync(new Date())
      
      // Refresh embedding stats to see new items in queue
      await fetchEmbeddingStats()
      
    } catch (error) {
      console.error('Data sync failed:', error)
      setSyncResult({
        success: false,
        message: 'Data sync request failed'
      })
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
      if (result.success) {
        console.log(`Processed ${result.processed || 'batch'} embeddings`)
        await fetchEmbeddingStats()
        
        // Update sync result to show embedding processing status
        setSyncResult({
          success: true,
          message: `Embedding processing completed: ${result.processed || 'batch'} items processed`
        })
      } else {
        setSyncResult({
          success: false,
          message: result.message || 'Embedding processing failed'
        })
      }
      
    } catch (error) {
      console.error('Failed to process embeddings:', error)
      setSyncResult({
        success: false,
        message: 'Embedding processing request failed'
      })
    } finally {
      setIsProcessingEmbeddings(false)
    }
  }

  // Load embedding stats on component mount
  useEffect(() => {
    fetchEmbeddingStats()
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchEmbeddingStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Data Sync</h2>
          <p className="text-muted-foreground">
            Manage your Gmail and Calendar synchronization
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
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
              <RefreshCw className={`w-4 h-4 mr-2 ${isProcessingEmbeddings ? 'animate-spin' : ''}`} />
              Process Embeddings
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p><strong>Sync Data:</strong> Fetches emails & calendar events to database (without AI processing)</p>
            <p><strong>Process Embeddings:</strong> Runs AI processing on queued items for search & insights</p>
            {(isSyncingData || isProcessingEmbeddings) && (
              <p className="text-foreground font-medium mt-1">
                {isSyncingData && "⏳ Syncing data..."}
                {isProcessingEmbeddings && "🧠 Processing embeddings..."}
              </p>
            )}
          </div>
        </div>

        {/* Embedding Queue Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                AI Embeddings Queue
              </h3>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {embeddingStats ? (
                <>
                  <div className="flex justify-between items-center">
                    <span>Pending:</span>
                    <span className="px-2 py-1 rounded-md bg-muted text-foreground font-medium text-xs">
                      {embeddingStats.pending}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Processing:</span>
                    <span className="px-2 py-1 rounded-md bg-muted text-foreground font-medium text-xs">
                      {embeddingStats.processing}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Completed:</span>
                    <span className="px-2 py-1 rounded-md bg-muted text-foreground font-medium text-xs">
                      {embeddingStats.completed}
                    </span>
                  </div>
                  {embeddingStats.failed > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Failed:</span>
                      <span className="px-2 py-1 rounded-md bg-destructive text-destructive-foreground font-medium text-xs">
                        {embeddingStats.failed}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <span>Loading stats...</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gmail Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Gmail Sync
              </h3>
              {syncResult?.results?.gmail?.success === true ? (
                <CheckCircle className="h-4 w-4 text-foreground" />
              ) : syncResult?.results?.gmail?.success === false ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-muted" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {syncResult?.results?.gmail?.success === true 
                ? `${syncResult.results.gmail.data?.messagesSynced || 0} messages synced`
                : syncResult?.results?.gmail?.error || 'Ready to sync'
              }
            </p>
          </CardContent>
        </Card>

        {/* Calendar Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Calendar Sync
              </h3>
              {syncResult?.results?.calendar?.success === true ? (
                <CheckCircle className="h-4 w-4 text-foreground" />
              ) : syncResult?.results?.calendar?.success === false ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-muted" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {syncResult?.results?.calendar?.success === true 
                ? `${syncResult.results.calendar.data?.eventsSynced || 0} events synced`
                : syncResult?.results?.calendar?.error || 'Ready to sync'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Status */}
      {syncResult && (
        <Card className={`${
          syncResult.success 
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
        }`}>
          <CardContent className="p-4">
            <p className={`text-sm ${
              syncResult.success 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-red-800 dark:text-red-200'
            }`}>
              {syncResult.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Last Sync Info */}
      {lastSync && (
        <div className="text-center text-sm text-muted-foreground">
          Last sync: {lastSync.toLocaleString()}
        </div>
      )}
    </div>
  )
}