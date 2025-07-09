'use client'

import React from 'react'
import { useUser } from '@clerk/nextjs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SlackIntegration } from './components/SlackIntegration'

export default function SettingsPage() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const [platformType, setPlatformType] = React.useState('whatsapp')

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="ai-agents">AI Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          <SlackIntegration />
          {/* Add other integration components here */}
        </TabsContent>

        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API keys and access tokens
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="ai-agents">
          <Card>
            <CardHeader>
              <CardTitle>AI Agents</CardTitle>
              <CardDescription>
                Configure your AI agent settings
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
