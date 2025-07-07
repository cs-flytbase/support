import { useEffect, useState } from 'react'
import { Card } from './card'
import { Progress } from './progress'

type SyncProgress = {
  type: 'contacts' | 'companies' | 'deals' | 'associations'
  progress: number
  total: number
  processed: number
  phase: 'fetching' | 'processing' | 'complete'
  recordsPerSecond: number
  estimatedTimeRemaining: number
  elapsedTime: number
}

export function SyncProgress() {
  const [progress, setProgress] = useState<SyncProgress | null>(null)

  useEffect(() => {
    const handleProgress = (event: CustomEvent<SyncProgress>) => {
      setProgress(event.detail)
    }

    window.addEventListener('hubspot-sync-progress', handleProgress as EventListener)
    return () => window.removeEventListener('hubspot-sync-progress', handleProgress as EventListener)
  }, [])

  if (!progress) return null

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium capitalize">
            Syncing {progress.type}...
          </h3>
          <div className="text-sm text-gray-500">
            {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}
          </div>
        </div>

        <Progress value={progress.progress} className="h-2" />

        <div className="grid grid-cols-3 gap-4 text-sm text-gray-500">
          <div>
            <div className="font-medium">Speed</div>
            <div>{progress.recordsPerSecond}/sec</div>
          </div>
          <div>
            <div className="font-medium">Elapsed</div>
            <div>{formatTime(progress.elapsedTime)}</div>
          </div>
          <div>
            <div className="font-medium">Remaining</div>
            <div>{formatTime(progress.estimatedTimeRemaining)}</div>
          </div>
        </div>

        {progress.phase === 'complete' && (
          <div className="text-sm text-green-600 font-medium">
            ✅ Sync completed successfully
          </div>
        )}
      </div>
    </Card>
  )
} 