import React, { useState } from "react";
import { Card } from "@/components/ui/card";

interface PipelineSummary {
  closedWon: number;
  contracted: number;
  totalPipeline: number;
  weightedPipeline: number;
}

interface QuarterlyPipeline {
  quarter: string;
  totalPipeline: number;
  weightedPipeline: number;
}

interface Deal {
  name: string;
  stage: string;
  closureDate: string;
  amount?: number | null;
}

interface BusinessDevSectionProps {
  pipeline2025: PipelineSummary;
  quarterlyPipelines: QuarterlyPipeline[];
  immediateDeals: Deal[];
  businessEnablers: string[];
}

export const BusinessDevSection: React.FC<BusinessDevSectionProps> = ({
  pipeline2025,
  quarterlyPipelines,
  immediateDeals,
  businessEnablers,
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const dealsPerPage = 5;
  
  // Calculate pagination
  const totalPages = Math.ceil(immediateDeals.length / dealsPerPage);
  const startIndex = (currentPage - 1) * dealsPerPage;
  const endIndex = startIndex + dealsPerPage;
  const currentDeals = immediateDeals.slice(startIndex, endIndex);
  
  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Calculate Q3 2025 pipeline from deals data
  const calculateQ3Pipeline = () => {
    const currentYear = new Date().getFullYear();
    const q3StartDate = new Date(currentYear, 6, 1); // July 1st
    const q3EndDate = new Date(currentYear, 8, 30); // September 30th
    
    let totalPipeline = 0;
    let weightedPipeline = 0;
    
    immediateDeals.forEach(deal => {
      if (deal.closureDate && deal.closureDate !== 'N/A' && deal.closureDate !== 'Loading...' && deal.closureDate !== 'Loading') {
        try {
          const closureDate = new Date(deal.closureDate);
          // Check if deal closure date falls in Q3 2025
          if (closureDate >= q3StartDate && closureDate <= q3EndDate) {
            const amount = deal.amount || 0;
            totalPipeline += amount;
            
            // Calculate weighted pipeline based on stage
            // Assuming different stages have different probability weights
            let weight = 0.5; // default weight
            if (deal.stage) {
              const stage = deal.stage.toLowerCase();
              if (stage.includes('closed') || stage.includes('won')) {
                weight = 1.0;
              } else if (stage.includes('contract') || stage.includes('negotiation')) {
                weight = 0.8;
              } else if (stage.includes('proposal') || stage.includes('quote')) {
                weight = 0.6;
              } else if (stage.includes('qualified') || stage.includes('demo')) {
                weight = 0.4;
              } else if (stage.includes('discovery') || stage.includes('initial')) {
                weight = 0.2;
              }
            }
            weightedPipeline += amount * weight;
          }
        } catch (error) {
          // Skip invalid dates
          console.warn('Invalid date format for deal:', deal.name, deal.closureDate);
        }
      }
    });
    
    return {
      totalPipeline: Math.round(totalPipeline),
      weightedPipeline: Math.round(weightedPipeline)
    };
  };

  const q3Calculations = calculateQ3Pipeline();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
      {/* 2025 Pipeline Summary */}
      <Card className="p-4 min-w-[220px] flex flex-col gap-2">
        <div className="font-semibold mb-2">2025</div>
        <div className="flex justify-between text-sm">
          <span>Closed Won:</span>
          <span className="font-medium">${pipeline2025.closedWon.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Contracted:</span>
          <span className="font-medium">${pipeline2025.contracted.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Total Pipeline:</span>
          <span className="font-medium">${pipeline2025.totalPipeline.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span>Weighted Pipeline:</span>
          <span className="font-medium">${pipeline2025.weightedPipeline.toLocaleString()}</span>
        </div>
        
        {/* Q3 2025 - Now calculated from deals data */}
        <div className="mt-2">
          <div className="text-xs font-semibold">Q3 2025</div>
          <div className="flex justify-between text-xs">
            <span>Total Pipeline:</span>
            <span>{q3Calculations.totalPipeline.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Weighted Pipeline:</span>
            <span>{q3Calculations.weightedPipeline.toLocaleString()}</span>
          </div>
        </div>
        
        {/* Other quarterly pipelines from props */}
        {quarterlyPipelines.filter(q => q.quarter !== 'Q3 2025').map((q) => (
          <div key={q.quarter} className="mt-2">
            <div className="text-xs font-semibold">{q.quarter}</div>
            <div className="flex justify-between text-xs">
              <span>Total Pipeline:</span>
              <span>{q.totalPipeline.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Weighted Pipeline:</span>
              <span>{q.weightedPipeline.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </Card>

      {/* Immediate Deals Table with Pagination */}
      <Card className="p-4 min-w-[400px]">
        <div className="font-semibold mb-2">Immediate Deals (3 Months)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-y-1">
            <thead>
              <tr>
                <th className="text-left font-medium">Deal</th>
                <th className="text-left font-medium">Stage</th>
                <th className="text-left font-medium">Amount</th>
                <th className="text-left font-medium">Date of Closure</th>
              </tr>
            </thead>
            <tbody>
              {currentDeals.map((deal, i) => (
                <tr key={deal.name + i} className="border-b last:border-b-0">
                  <td className="pr-2">{deal.name}</td>
                  <td className="pr-2">{deal.stage}</td>
                  <td className="pr-2">
                    {deal.amount !== null && deal.amount !== undefined 
                      ? `$${deal.amount.toLocaleString()}` 
                      : 'N/A'}
                  </td>
                  <td>{deal.closureDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-end mt-3 text-xs text-gray-500 gap-2">
              {getPageNumbers().map((pageNum) => (
                <span 
                  key={pageNum}
                  className={`cursor-pointer px-2 py-1 rounded ${
                    currentPage === pageNum 
                      ? 'bg-blue-100 text-blue-700 font-medium' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </span>
              ))}
            </div>
          )}
          
          {/* Show pagination info if there are deals */}
          {immediateDeals.length > 0 && (
            <div className="text-xs text-gray-400 mt-2 text-center">
              Showing {startIndex + 1}-{Math.min(endIndex, immediateDeals.length)} of {immediateDeals.length} deals
            </div>
          )}
        </div>
      </Card>

      {/* Business Enabler */}
      <Card className="p-4 min-w-[220px]">
        <div className="font-semibold mb-2">Business Enabler</div>
        <ul className="text-sm list-disc list-inside">
          {businessEnablers.map((enabler, i) => (
            <li key={enabler + i}>{enabler}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
