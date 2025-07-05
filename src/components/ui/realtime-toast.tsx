'use client'

import { toast } from 'sonner'
import { Mail, Calendar, Zap, Activity } from 'lucide-react'

export const showRealtimeToast = {
  emailAdded: (subject: string) => {
    toast(
      <div className="flex items-center gap-3">
        <Mail className="h-5 w-5 text-blue-500" />
        <div>
          <p className="font-medium">New Email Synced</p>
          <p className="text-sm text-muted-foreground truncate">
            {subject || 'Untitled Email'}
          </p>
        </div>
      </div>,
      {
        duration: 4000,
        position: "bottom-right",
      }
    )
  },

  calendarAdded: (summary: string) => {
    toast(
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-green-500" />
        <div>
          <p className="font-medium">New Event Synced</p>
          <p className="text-sm text-muted-foreground truncate">
            {summary || 'Untitled Event'}
          </p>
        </div>
      </div>,
      {
        duration: 4000,
        position: "bottom-right",
      }
    )
  },

  embeddingQueueUpdate: (count: number, status: string) => {
    toast(
      <div className="flex items-center gap-3">
        <Zap className="h-5 w-5 text-purple-500" />
        <div>
          <p className="font-medium">AI Queue Updated</p>
          <p className="text-sm text-muted-foreground">
            {count} items now {status}
          </p>
        </div>
      </div>,
      {
        duration: 3000,
        position: "bottom-right",
      }
    )
  },

  connectionStatus: (connected: boolean) => {
    if (connected) {
      toast(
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <div>
            <p className="font-medium text-green-700">Real-time Connected</p>
            <p className="text-sm text-muted-foreground">
              Database updates will appear instantly
            </p>
          </div>
        </div>,
        {
          duration: 3000,
          position: "bottom-right",
        }
      )
    } else {
      toast(
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div>
            <p className="font-medium text-red-700">Real-time Disconnected</p>
            <p className="text-sm text-muted-foreground">
              Trying to reconnect...
            </p>
          </div>
        </div>,
        {
          duration: 5000,
          position: "bottom-right",
        }
      )
    }
  }
} 