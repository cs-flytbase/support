"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CustomerDashboard } from './CustomerDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

interface CustomerDetailViewProps {
  customerId: string;
}

export function CustomerDetailView({ customerId }: CustomerDetailViewProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        
        // Fetch customer details
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select(`
            *,
            agents(name)
          `)
          .eq('id', customerId)
          .single();
          
        if (customerError) throw customerError;
        
        // Fetch renewal date
        const { data: renewalData, error: renewalError } = await supabase
          .from('renewal_date')
          .select('renewal_date')
          .eq('customer_id', customerId)
          .order('renewal_date', { ascending: true })
          .limit(1);
          
        if (renewalError) throw renewalError;
        
        // Fetch call counts for engagement metrics
        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('created_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: true });
          
        if (callsError) throw callsError;
        
        // Fetch message counts for engagement metrics
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('created_at')
          .eq('conversation_id', customerId) // Assuming message is linked to customer via conversation
          .order('created_at', { ascending: true });
          
        if (messagesError) throw messagesError;
        
        // Fetch issue data
        const { data: issuesData, error: issuesError } = await supabase
          .from('issues')
          .select(`
            id,
            status,
            customer_issues!inner(customer_id)
          `)
          .eq('customer_issues.customer_id', customerId);
          
        if (issuesError) throw issuesError;
        
        // Fetch call analysis for sentiment
        const { data: callAnalysisData, error: callAnalysisError } = await supabase
          .from('call_analysis')
          .select(`
            sentiment,
            calls!inner(customer_id)
          `)
          .eq('calls.customer_id', customerId);
          
        if (callAnalysisError) throw callAnalysisError;
        
        // Process engagement metrics data
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        
        // Generate months array for the past 6 months
        const monthsArray: string[] = [];
        for (let i = 0; i < 6; i++) {
          const d = new Date(sixMonthsAgo);
          d.setMonth(sixMonthsAgo.getMonth() + i);
          monthsArray.push(monthNames[d.getMonth()]);
        }
        
        // Initialize engagement data
        const engagementData = {
          emails: monthsArray.map(month => ({ label: month, value: Math.floor(Math.random() * 30) })), // Mock data for emails
          calls: monthsArray.map(month => ({ label: month, value: 0 })),
          messages: monthsArray.map(month => ({ label: month, value: 0 }))
        };
        
        // Populate calls data
        if (callsData) {
          callsData.forEach(call => {
            const callDate = new Date(call.created_at);
            if (callDate >= sixMonthsAgo) {
              const monthIndex = monthsArray.indexOf(monthNames[callDate.getMonth()]);
              if (monthIndex !== -1) {
                engagementData.calls[monthIndex].value += 1;
              }
            }
          });
        }
        
        // Populate messages data
        if (messagesData) {
          messagesData.forEach(message => {
            const messageDate = new Date(message.created_at);
            if (messageDate >= sixMonthsAgo) {
              const monthIndex = monthsArray.indexOf(monthNames[messageDate.getMonth()]);
              if (monthIndex !== -1) {
                engagementData.messages[monthIndex].value += 1;
              }
            }
          });
        }
        
        // Calculate issue counts
        const openIssues = issuesData ? issuesData.filter(issue => issue.status === 'open').length : 0;
        const closedIssues = issuesData ? issuesData.filter(issue => issue.status === 'closed').length : 0;
        
        // Calculate sentiment data
        // In a real app, you'd analyze actual sentiment data, here we're simulating
        const sentimentData = {
          calls: Math.max(callsData?.length || 0, 15), // Mock value
          conversations: Math.max(10, Math.floor(Math.random() * 25)), // Mock value
          emails: Math.max(5, Math.floor(Math.random() * 20)) // Mock value
        };
        
        // Set dashboard data
        setDashboardData({
          customerName: customer.name,
          status: customer.status || 'Active',
          plan: customer.plan || 'Enterprise',
          lifecycleStage: customer.lifecycle_stage || 'Adoption',
          renewalDate: renewalData && renewalData.length > 0 
            ? new Date(renewalData[0].renewal_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
            : 'Sep 30, 2024',
          healthScore: customer.health_score || 82,
          engagementData,
          sentimentData,
          supportIssues: {
            open: openIssues,
            closed: closedIssues
          },
          recentActivity: "Spoke with customer about product updates and upcoming training session. Customer expressed satisfaction with new features but had some concerns about onboarding process.",
          assignedAgent: customer.agents?.name || null
        });
      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        setError(err.message || 'Failed to load customer dashboard');
      } finally {
        setLoading(false);
      }
    }
    
    loadDashboardData();
  }, [customerId, supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
        <p>{error}</p>
      </div>
    );
  }

  if (!dashboardData) {
    return <div>No customer data found.</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <CustomerDashboard {...dashboardData} />
        </TabsContent>
        <TabsContent value="details">
          <Card className="p-6">
            <p className="text-muted-foreground">Customer details will be shown here.</p>
          </Card>
        </TabsContent>
        <TabsContent value="contacts">
          <Card className="p-6">
            <p className="text-muted-foreground">Contacts will be shown here.</p>
          </Card>
        </TabsContent>
        <TabsContent value="calls">
          <Card className="p-6">
            <p className="text-muted-foreground">Calls will be shown here.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
