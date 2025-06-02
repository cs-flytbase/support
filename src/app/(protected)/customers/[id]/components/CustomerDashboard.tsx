import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgressCircle } from '@/components/ui/progress-circle';
import { ProgressBar } from '@/components/ui/progress-bar';
import { LineChart } from '@/components/ui/line-chart';
import { CustomerInfoCard } from './CustomerInfoCard';
import { CustomerDetails, CustomerContact } from '../types';

interface CustomerDashboardProps {
  customer: CustomerDetails;
  contacts: CustomerContact[];
  onEdit: () => void;
  onSetPrimaryContact?: (contactId: string) => Promise<void>;
  formatDate: (date: string | null) => string;
  status: string;
  plan: string;
  lifecycleStage: string;
  renewalDate: string;
  healthScore: number;
  engagementData: {
    emails: { label: string; value: number }[];
    calls: { label: string; value: number }[];
    messages: { label: string; value: number }[];
  };
  sentimentData: {
    calls: number;
    conversations: number;
    emails: number;
  };
  supportIssues: {
    open: number;
    closed: number;
  };
  recentActivity: string;
  assignedAgent?: string;
}

export function CustomerDashboard({
  customer,
  contacts,
  onEdit,
  onSetPrimaryContact,
  formatDate,
  status,
  plan,
  lifecycleStage,
  renewalDate,
  healthScore,
  engagementData,
  sentimentData,
  supportIssues,
  recentActivity,
  assignedAgent
}: CustomerDashboardProps) {
  // Calculate sentiment percentages
  const totalSentiment = sentimentData.calls + sentimentData.conversations + sentimentData.emails;
  const getPercentage = (value: number) => Math.round((value / totalSentiment) * 100);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Info Card */}
        <CustomerInfoCard
          customer={customer}
          contacts={contacts}
          onEdit={onEdit}
          onSetPrimaryContact={onSetPrimaryContact}
          formatDate={formatDate}
        />

        {/* Health Score Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Health Score</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ProgressCircle 
              value={healthScore} 
              size="lg" 
              strokeClassName={healthScore > 75 ? "text-green-500" : healthScore > 50 ? "text-yellow-500" : "text-red-500"}
              valueClassName="text-3xl font-bold"
            />
          </CardContent>
        </Card>

        {/* Lifecycle Stage and Renewal Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Lifecycle Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-2xl font-bold">{lifecycleStage}</p>
            
            <div>
              <p className="text-lg font-medium">Renewal Date</p>
              <p className="text-2xl font-bold">{renewalDate}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Metrics</CardTitle>
          <CardDescription>Activity over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <LineChart 
            width={800}
            height={300}
            series={[
              { data: engagementData.emails, color: '#3b82f6', label: 'Emails' },
              { data: engagementData.calls, color: '#a855f7', label: 'Calls' },
              { data: engagementData.messages, color: '#10b981', label: 'Messages' }
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sentiment Analysis Card */}
        <Card>
          <CardHeader>
            <CardTitle>Communication Sentiment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar 
              value={sentimentData.calls} 
              max={totalSentiment} 
              label="Calls" 
              showValue={true} 
              indicatorClassName="bg-green-500"
              valuePrefix=""
              valueSuffix={`% (${sentimentData.calls})`}
            />
            <ProgressBar 
              value={sentimentData.conversations} 
              max={totalSentiment} 
              label="Conversations" 
              showValue={true}
              indicatorClassName="bg-blue-500"
              valuePrefix=""
              valueSuffix={`% (${sentimentData.conversations})`}
            />
            <ProgressBar 
              value={sentimentData.emails} 
              max={totalSentiment} 
              label="Emails" 
              showValue={true}
              indicatorClassName="bg-purple-500"
              valuePrefix=""
              valueSuffix={`% (${sentimentData.emails})`}
            />
          </CardContent>
        </Card>

        {/* Support Issues Card */}
        <Card>
          <CardHeader>
            <CardTitle>Support Issue Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Open Issues</span>
              <span className="text-lg font-semibold">{supportIssues.open}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Closed Issues</span>
              <div className="flex items-center">
                <div className="w-32 bg-blue-500 h-5 rounded mr-2"></div>
                <span className="text-lg font-semibold">{supportIssues.closed}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line">{recentActivity}</p>
        </CardContent>
      </Card>
    </div>
  );
}
