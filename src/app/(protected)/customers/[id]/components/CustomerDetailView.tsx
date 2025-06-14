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
        // First get conversations associated with this customer
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select('id')
          .eq('customer_id', customerId);
          
        if (conversationsError) throw conversationsError;
        
        // Then get messages from those conversations
        let messagesData: { created_at: string }[] = [];
        if (conversationsData && conversationsData.length > 0) {
          const conversationIds = conversationsData.map(conv => conv.id);
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('created_at')
            .in('conversation_id', conversationIds)
            .order('created_at', { ascending: true });
            
          if (messagesError) throw messagesError;
          messagesData = messages || [];
        }
        
        // Fetch issue data - first get the customer issues relations
        const { data: customerIssuesData, error: customerIssuesError } = await supabase
          .from('customer_issues')
          .select('issue_id')
          .eq('customer_id', customerId);
          
        if (customerIssuesError) throw customerIssuesError;
        
        // Then get the actual issues
        let issuesData: { id: string, status: string }[] = [];
        if (customerIssuesData && customerIssuesData.length > 0) {
          const issueIds = customerIssuesData.map(ci => ci.issue_id);
          const { data: issues, error: issuesError } = await supabase
            .from('issues')
            .select('id, status')
            .in('id', issueIds);
            
          if (issuesError) throw issuesError;
          issuesData = issues || [];
        }
        
        // Fetch calls for this customer first
        const { data: customerCalls, error: customerCallsError } = await supabase
          .from('calls')
          .select('id')
          .eq('customer_id', customerId);
          
        if (customerCallsError) throw customerCallsError;
        
        // Then fetch call analysis for those calls
        let callAnalysisData: { overall_sentiment: number | null, customer_sentiment: number | null, agent_sentiment: number | null }[] = [];
        if (customerCalls && customerCalls.length > 0) {
          const callIds = customerCalls.map(call => call.id);
          const { data: analysis, error: callAnalysisError } = await supabase
            .from('call_analysis')
            .select('overall_sentiment, customer_sentiment, agent_sentiment')
            .in('call_id', callIds);
            
          if (callAnalysisError) throw callAnalysisError;
          callAnalysisData = analysis || [];
        }
        
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
        
        // Calculate sentiment data from actual call analysis data
        // Extract and process the sentiment scores from call analysis
        let totalCallSentiment = 0;
        let customerSentiment = 0;
        let agentSentiment = 0;
        
        if (callAnalysisData && callAnalysisData.length > 0) {
          callAnalysisData.forEach(analysis => {
            // Sum up all the sentiment scores (they are numeric values)
            if (analysis.overall_sentiment !== null) totalCallSentiment += Number(analysis.overall_sentiment);
            if (analysis.customer_sentiment !== null) customerSentiment += Number(analysis.customer_sentiment);
            if (analysis.agent_sentiment !== null) agentSentiment += Number(analysis.agent_sentiment);
          });
          
          // Average them out if we have data
          if (callAnalysisData.length > 0) {
            totalCallSentiment = Math.round(totalCallSentiment / callAnalysisData.length * 10);
            customerSentiment = Math.round(customerSentiment / callAnalysisData.length * 10);
            agentSentiment = Math.round(agentSentiment / callAnalysisData.length * 10);
          }
        }
        
        // Prepare sentiment data for display
        // For emails, we'll use a scale from 0 to 1 to match the email detail page
        // where > 0.60 is positive, >= 0.40 is neutral, < 0.40 is negative
        
        // Fetch email sentiment data for this customer
        const { data: emailData, error: emailError } = await supabase
          .from('email')
          .select('sentiment')
          .eq('company_id', customerId)
          .not('sentiment', 'is', null);
          
        let emailSentiment = 0.5; // Default to neutral
        
        if (emailData && emailData.length > 0) {
          // Calculate average sentiment from email data
          const validSentiments = emailData.filter(email => email.sentiment !== null);
          if (validSentiments.length > 0) {
            const avgSentiment = validSentiments.reduce(
              (sum, email) => sum + Number(email.sentiment), 0
            ) / validSentiments.length;
            emailSentiment = avgSentiment;
          }
        }
        
        const sentimentData = {
          calls: Math.max(totalCallSentiment, 5),
          conversations: Math.max(customerSentiment, 5),
          // Scale to match the same range as used in the email detail page
          emails: emailSentiment
        };
        
        // Log raw data from database
        console.log('Customer from DB:', customer);
        console.log('Call sentiment score:', customer.call_sentiment_score);
        
        // Process data - ensure call_sentiment_score is properly converted to number
        let callSentiment = 0.6; // Default hard-coded value for CSX customer
        if (typeof customer.call_sentiment_score === 'number') {
          callSentiment = customer.call_sentiment_score;
        } else if (customer.call_sentiment_score !== null && customer.call_sentiment_score !== undefined) {
          callSentiment = parseFloat(customer.call_sentiment_score);
        }
        
        console.log('Customer name:', customer.name);
        console.log('Raw call_sentiment_score:', customer.call_sentiment_score);
        console.log('Processed call_sentiment_score:', callSentiment);
        
        // Set dashboard data
        setDashboardData({
          customerName: customer.name,
          status: customer.status || 'Active',
          plan: customer.plan || 'Enterprise',
          lifecycleStage: customer.lifecycle_stage || 'Adoption',
          renewalDate: renewalData && renewalData.length > 0 
            ? new Date(renewalData[0].renewal_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
            : 'Sep 30, 2024',
          callSentimentScore: callSentiment, // Use processed value
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
