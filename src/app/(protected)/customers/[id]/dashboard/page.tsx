"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CustomerDetailView } from '../components/CustomerDetailView';
import { Button } from '@/components/ui/button';

export default function CustomerDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center mb-6">
        <Button 
          onClick={() => router.back()} 
          variant="outline" 
          className="mr-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Details
        </Button>
        <h1 className="text-2xl font-bold">Customer Dashboard</h1>
      </div>

      {/* Customer Dashboard View */}
      <CustomerDetailView customerId={customerId} />
    </div>
  );
}
