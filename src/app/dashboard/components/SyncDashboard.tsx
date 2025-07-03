// components/SyncDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [embeddingStats, setEmbeddingStats] = useState<EmbeddingStats | null>(null)
  const [isProcessingEmbeddings, setIsProcessingEmbeddings] = useState(false)

  // Trigger manual sync
  const triggerSync = async (syncType: 'full' | 'incremental') => {
    setIsLoading(true)
    setSyncResult(null)
    
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType })
      })
      
      const result = await response.json()
      setSyncResult(result)
      setLastSync(new Date())
      
      // Refresh embedding stats after sync
      await fetchEmbeddingStats()
      
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncResult({
        success: false,
        message: 'Sync request failed'
      })
    } finally {
      setIsLoading(false)
    }
  }

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

  // Process embedding queue manually
  const processEmbeddings = async () => {
    setIsProcessingEmbeddings(true)
    
    try {
      const response = await fetch('/api/sync/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 10 })
      })
      
      const result = await response.json()
      if (result.success) {
        console.log(`Processed ${result.processed} embeddings`)
        await fetchEmbeddingStats()
      }
      
    } catch (error) {
      console.error('Failed to process embeddings:', error)
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
          <h2 className="text-2xl font-bold">Data Sync</h2>
          <p className="text-gray-600">
            Manage your Gmail and Calendar synchronization
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => triggerSync('incremental')}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Quick Sync
          </Button>
          
          <Button
            onClick={() => triggerSync('full')}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Full Sync
          </Button>
        </div>

        {/* Embedding Queue Status */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-purple-600" />
              AI Embeddings
            </h3>
            <Button
              onClick={processEmbeddings}
              disabled={isProcessingEmbeddings}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isProcessingEmbeddings ? 'animate-spin' : ''}`} />
              Process
            </Button>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            {embeddingStats ? (
              <>
                <div className="flex justify-between">
                  <span>Pending:</span>
                  <span className="font-medium text-orange-600">{embeddingStats.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span>Processing:</span>
                  <span className="font-medium text-blue-600">{embeddingStats.processing}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span className="font-medium text-green-600">{embeddingStats.completed}</span>
                </div>
                {embeddingStats.failed > 0 && (
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <span className="font-medium text-red-600">{embeddingStats.failed}</span>
                  </div>
                )}
              </>
            ) : (
              <span>Loading stats...</span>
            )}
          </div>
        </div>
      </div>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gmail Status */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-green-600" />
              Gmail Sync
            </h3>
            {syncResult?.results?.gmail?.success === true ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : syncResult?.results?.gmail?.success === false ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <div className="h-4 w-4 rounded-full bg-gray-300" />
            )}
          </div>
          <p className="text-xs text-gray-600">
            {syncResult?.results?.gmail?.success === true 
              ? `${syncResult.results.gmail.data?.messagesSynced || 0} messages synced`
              : syncResult?.results?.gmail?.error || 'Ready to sync'
            }
          </p>
        </div>

        {/* Calendar Status */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Calendar Sync
            </h3>
            {syncResult?.results?.calendar?.success === true ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : syncResult?.results?.calendar?.success === false ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <div className="h-4 w-4 rounded-full bg-gray-300" />
            )}
          </div>
          <p className="text-xs text-gray-600">
            {syncResult?.results?.calendar?.success === true 
              ? `${syncResult.results.calendar.data?.eventsSynced || 0} events synced`
              : syncResult?.results?.calendar?.error || 'Ready to sync'
            }
          </p>
        </div>
      </div>

      {/* Overall Status */}
      {syncResult && (
        <div className={`p-4 rounded-lg ${
          syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${
            syncResult.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {syncResult.message}
          </p>
        </div>
      )}

      {/* Last Sync Info */}
      {lastSync && (
        <div className="text-center text-sm text-gray-500">
          Last sync: {lastSync.toLocaleString()}
        </div>
      )}
    </div>
  )
}