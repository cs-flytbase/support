'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RefreshCw, 
  Mail, 
  Calendar, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Download,
  Upload,
  Activity,
  Settings,
  Zap
} from 'lucide-react'

interface SyncStats {
  gmail: {
    totalEmails: number
    lastSyncAt: string | null
    isActive: boolean
    syncInProgress: boolean
  }
  calendar: {
    totalEvents: number
    lastSyncAt: string | null
    isActive: boolean
    syncInProgress: boolean
  }
  embeddings: {
    pending: number
    processing: number
    completed: number
    failed: number
  }
}

interface SyncProgress {
  isActive: boolean
  service: 'gmail' | 'calendar' | 'embeddings' | null
  progress: number
  currentAction: string
  itemsProcessed: number
  totalItems: number
}

export default function SyncPage() {
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    isActive: false,
    service: null,
    progress: 0,
    currentAction: '',
    itemsProcessed: 0,
    totalItems: 0
  })
  const [logs, setLogs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch sync statistics
  const fetchStats = async () => {
    try {
      const [syncResponse, embeddingResponse] = await Promise.all([
        fetch('/api/sync'),
        fetch('/api/sync/embeddings')
      ])

      const syncData = await syncResponse.json()
      const embeddingData = await embeddingResponse.json()

      setStats({
        gmail: {
          totalEmails: syncData.integrations?.gmail?.metadata?.totalEmails || 0,
          lastSyncAt: syncData.integrations?.gmail?.lastSyncAt || null,
          isActive: syncData.integrations?.gmail?.isActive || false,
          syncInProgress: false
        },
        calendar: {
          totalEvents: syncData.integrations?.calendar?.metadata?.totalEvents || 0,
          lastSyncAt: syncData.integrations?.calendar?.lastSyncAt || null,
          isActive: syncData.integrations?.calendar?.isActive || false,
          syncInProgress: false
        },
        embeddings: embeddingData.stats || { pending: 0, processing: 0, completed: 0, failed: 0 }
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      addLog('❌ Failed to fetch sync statistics')
    }
  }

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)])
  }

  // Trigger sync with progress tracking
  const triggerSync = async (service: 'gmail' | 'calendar' | 'both', syncType: 'full' | 'incremental') => {
    setIsLoading(true)
    setSyncProgress({
      isActive: true,
      service: service === 'both' ? null : service,
      progress: 0,
      currentAction: `Starting ${syncType} sync for ${service}...`,
      itemsProcessed: 0,
      totalItems: 0
    })

    addLog(`🚀 Starting ${syncType} sync for ${service}`)

    try {
      const services = service === 'both' ? ['gmail', 'calendar'] : [service]
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 15, 90)
        }))
      }, 500)

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services, syncType })
      })

      clearInterval(progressInterval)
      
      const result = await response.json()

      if (result.success) {
        // Update progress based on results
        let totalProcessed = 0
        if (result.gmail?.success) {
          totalProcessed += result.gmail.data?.messagesSynced || result.gmail.data?.eventssSynced || 0
          addLog(`✅ Gmail: ${result.gmail.data?.messagesSynced || 0} messages synced`)
        }
        if (result.calendar?.success) {
          totalProcessed += result.calendar.data?.eventsSynced || 0
          addLog(`✅ Calendar: ${result.calendar.data?.eventsSynced || 0} events synced`)
        }

        setSyncProgress(prev => ({
          ...prev,
          progress: 100,
          currentAction: 'Sync completed successfully',
          itemsProcessed: totalProcessed,
          totalItems: totalProcessed
        }))

        addLog(`🎉 Sync completed: ${totalProcessed} items processed`)
      } else {
        addLog(`❌ Sync failed: ${result.error || 'Unknown error'}`)
        setSyncProgress(prev => ({
          ...prev,
          progress: 0,
          currentAction: 'Sync failed'
        }))
      }

      // Refresh stats
      await fetchStats()
      
    } catch (error) {
      console.error('Sync failed:', error)
      addLog(`❌ Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setSyncProgress(prev => ({
        ...prev,
        progress: 0,
        currentAction: 'Sync failed'
      }))
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setSyncProgress({
          isActive: false,
          service: null,
          progress: 0,
          currentAction: '',
          itemsProcessed: 0,
          totalItems: 0
        })
      }, 3000)
    }
  }

  // Process embeddings
  const processEmbeddings = async () => {
    setIsLoading(true)
    setSyncProgress({
      isActive: true,
      service: 'embeddings' as any,
      progress: 0,
      currentAction: 'Processing AI embeddings...',
      itemsProcessed: 0,
      totalItems: stats?.embeddings.pending || 0
    })

    addLog('🧠 Starting embedding processing...')

    try {
      const response = await fetch('/api/sync/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 20 })
      })

      const result = await response.json()

      if (result.success) {
        addLog(`✅ Processed ${result.processed} embeddings`)
        setSyncProgress(prev => ({
          ...prev,
          progress: 100,
          currentAction: 'Embedding processing completed',
          itemsProcessed: result.processed
        }))
      } else {
        addLog(`❌ Embedding processing failed: ${result.error}`)
      }

      await fetchStats()
    } catch (error) {
      console.error('Embedding processing failed:', error)
      addLog(`❌ Embedding error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setSyncProgress({
          isActive: false,
          service: null,
          progress: 0,
          currentAction: '',
          itemsProcessed: 0,
          totalItems: 0
        })
      }, 2000)
    }
  }

  // Check database connection
  const testDatabaseConnection = async () => {
    addLog('🔍 Testing database connection...')
    try {
      const response = await fetch('/api/sync')
      if (response.ok) {
        addLog('✅ Database connection successful')
      } else {
        addLog('❌ Database connection failed')
      }
    } catch (error) {
      addLog('❌ Database connection error')
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString()
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Sync</h1>
          <p className="text-gray-600 mt-1">
            Manage your data synchronization and AI processing
          </p>
        </div>
        <Button onClick={testDatabaseConnection} variant="outline">
          <Database className="w-4 h-4 mr-2" />
          Test Connection
        </Button>
      </div>

      {/* Progress Bar */}
      {(isLoading || syncProgress.progress > 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{syncProgress.currentAction}</span>
                <span className="text-sm text-gray-500">
                  {syncProgress.itemsProcessed} / {syncProgress.totalItems || '?'}
                </span>
              </div>
              
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gmail">Gmail</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  onClick={() => triggerSync('both', 'incremental')}
                  disabled={isLoading}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="text-sm">Quick Sync</span>
                </Button>
                
                <Button 
                  onClick={() => triggerSync('both', 'full')}
                  disabled={isLoading}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-sm">Full Sync</span>
                </Button>
                
                <Button 
                  onClick={processEmbeddings}
                  disabled={isLoading}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <Activity className="w-5 h-5" />
                  <span className="text-sm">Process AI</span>
                </Button>
                
                <Button 
                  onClick={fetchStats}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">Refresh</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gmail Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gmail</CardTitle>
                <Mail className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.gmail.totalEmails || 0}</div>
                <p className="text-xs text-gray-600">Total emails</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={stats?.gmail.isActive ? "default" : "secondary"}>
                    {stats?.gmail.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {stats?.gmail.lastSyncAt && (
                    <span className="text-xs text-gray-500">
                      {formatLastSync(stats.gmail.lastSyncAt)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Calendar Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calendar</CardTitle>
                <Calendar className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.calendar.totalEvents || 0}</div>
                <p className="text-xs text-gray-600">Total events</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={stats?.calendar.isActive ? "default" : "secondary"}>
                    {stats?.calendar.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {stats?.calendar.lastSyncAt && (
                    <span className="text-xs text-gray-500">
                      {formatLastSync(stats.calendar.lastSyncAt)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Embeddings Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Embeddings</CardTitle>
                <Activity className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.embeddings.completed || 0}</div>
                <p className="text-xs text-gray-600">Completed</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Pending:</span>
                    <Badge variant="outline">{stats?.embeddings.pending || 0}</Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Processing:</span>
                    <Badge variant="outline">{stats?.embeddings.processing || 0}</Badge>
                  </div>
                  {(stats?.embeddings.failed || 0) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>Failed:</span>
                      <Badge variant="destructive">{stats?.embeddings.failed}</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Gmail Tab */}
        <TabsContent value="gmail" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gmail Synchronization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => triggerSync('gmail', 'incremental')}
                  disabled={isLoading}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Incremental Sync
                </Button>
                <Button 
                  onClick={() => triggerSync('gmail', 'full')}
                  disabled={isLoading}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Full Sync
                </Button>
              </div>
              
              {stats?.gmail && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={stats.gmail.isActive ? "default" : "secondary"}>
                      {stats.gmail.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Emails:</span>
                    <span className="font-medium">{stats.gmail.totalEmails}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Sync:</span>
                    <span className="text-sm text-gray-600">
                      {formatLastSync(stats.gmail.lastSyncAt)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Synchronization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => triggerSync('calendar', 'incremental')}
                  disabled={isLoading}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Incremental Sync
                </Button>
                <Button 
                  onClick={() => triggerSync('calendar', 'full')}
                  disabled={isLoading}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Full Sync
                </Button>
              </div>
              
              {stats?.calendar && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={stats.calendar.isActive ? "default" : "secondary"}>
                      {stats.calendar.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Events:</span>
                    <span className="font-medium">{stats.calendar.totalEvents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Sync:</span>
                    <span className="text-sm text-gray-600">
                      {formatLastSync(stats.calendar.lastSyncAt)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sync Logs</CardTitle>
              <Button 
                onClick={() => setLogs([])} 
                variant="outline" 
                size="sm"
              >
                Clear Logs
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center mt-8">
                    No logs yet. Start a sync operation to see logs here.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 