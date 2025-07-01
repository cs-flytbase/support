"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { BusinessDevSection } from './BusinessDevSection';
import { ImmediateNextStepsSection } from './ImmediateNextStepsSection';
import { CustomerDetails, CustomerContact, Deal } from '../types';

interface CustomerDashboardCardProps {
  customer: CustomerDetails;
  contacts: CustomerContact[];
  deals: Deal[];
  dealsLoading: boolean;
  dealsError: string | null;
  fcSummarySection: React.ReactNode;
}

export function CustomerDashboardCard({
  customer,
  contacts,
  deals,
  dealsLoading,
  dealsError,
  fcSummarySection
}: CustomerDashboardCardProps) {
  return (
    <Card className="p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        {/* Customer Name & Location */}
        <div>
          <div className="font-bold text-lg">{customer.name}</div>
          <div className="text-gray-500 text-sm">
            {customer.country && customer.region 
              ? `${customer.country}, ${customer.region}` 
              : customer.country || customer.region || 'Location N/A'}
          </div>
        </div>

        {/* Stakeholder Matrix */}
        <div>
          <div className="font-semibold text-sm mb-1">Stakeholder Matrix</div>
          <ul className="text-xs text-gray-700">
            {contacts.filter(c => c.title).slice(0, 2).map((c, i) => (
              <li key={c.id || i}>
                {c.name} <span className="text-gray-400">{c.title}</span>
              </li>
            ))}
            {contacts.filter(c => c.title).length === 0 && (
              <li className="text-gray-400">No stakeholder data</li>
            )}
          </ul>
        </div>

        {/* Overall Sentiment */}
        <div className="flex flex-col items-center">
          <span className="font-semibold text-sm mb-1">Overall Sentiment</span>
          <span className="text-2xl">
            {/* Emoji based on sentiment score */}
            {customer.call_sentiment_score == null
              ? '❓'
              : customer.call_sentiment_score > 0.7
                ? '😊'
                : customer.call_sentiment_score > 0.4
                  ? '😐'
                  : '😞'}
          </span>
          <span className="text-xs text-gray-500">
            {customer.call_sentiment_score == null 
              ? 'No sentiment available' 
              : customer.call_sentiment_score > 0.7 
                ? 'Happy' 
                : customer.call_sentiment_score > 0.4 
                  ? 'Neutral' 
                  : 'Unhappy'}
          </span>
        </div>

        {/* Sentiment Summary */}
        <div>
          <div className="font-semibold text-sm mb-1">Sentiment Summary</div>
          <div className="text-xs text-gray-700">
            {customer.customer_profile 
              ? customer.customer_profile.slice(0, 60) + (customer.customer_profile.length > 60 ? '...' : '') 
              : 'No summary available.'}
          </div>
        </div>
      </div>

      {/* FC Summary Section (Live Data) */}
      <div className="mt-6">
        {customer?.partner_org_id && fcSummarySection}
        {!customer?.partner_org_id && (
          <div className="p-4 text-gray-500 text-center bg-gray-50 rounded">
            No partner org ID available for this customer.
          </div>
        )}
      </div>

      {/* Business Development Section */}
      <div className="mt-6">
        <BusinessDevSection
          pipeline2025={{
            closedWon: customer.closed_won || 0,
            contracted: customer.Contracted || 0,
            totalPipeline: customer.totalPipelineAmount || 0,
            weightedPipeline: customer["Weighted Pipeline"] || 0,  
          }}
          quarterlyPipelines={[
            { quarter: 'Q3 2025', totalPipeline: 50000, weightedPipeline: 20000 },
          ]}
          immediateDeals={dealsLoading ? [
            { name: 'Loading deals...', stage: 'Loading', closureDate: 'Loading...' }
          ] : dealsError ? [
            { name: 'Error loading deals', stage: 'Error', closureDate: dealsError }
          ] : deals.length > 0 ? deals : [
            { name: 'No deals found', stage: 'N/A', closureDate: 'N/A' }
          ]}
          businessEnablers={['Collaterals', 'Blockers']}
        />
      </div>

      {/* Immediate Next Steps Section */}
      <div className="mt-6">
        <ImmediateNextStepsSection
          bdStep={"Follow up with Customer 1 and finalize contract for Q3."}
          seStep={"Prepare demo for Deal 2 and review product feedback."}
          mktStep={"Draft case study for closed deal and update website."}
        />
      </div>
    </Card>
  );
}
