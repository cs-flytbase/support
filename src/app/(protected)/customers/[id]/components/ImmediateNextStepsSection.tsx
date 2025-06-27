import React from "react";
import { Card } from "@/components/ui/card";

interface Deal {
  name: string;
  stage: string;
  closureDate: string;
  amount: number; // Added amount field
}

interface ImmediateNextStepsSectionProps {
  bdStep: string;
  seStep: string;
  mktStep: string;
  deals?: Deal[]; // Added deals array
}

export const ImmediateNextStepsSection: React.FC<ImmediateNextStepsSectionProps> = ({
  bdStep,
  seStep,
  mktStep,
  deals = [], // Default to empty array
}) => {
  return (
    <Card className="p-4 my-8">
      <div className="font-semibold mb-3 text-sm">Immediate Next Steps</div>
      
      {/* Steps Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-x border rounded overflow-hidden min-h-[100px] mb-6">
        <div className="p-4 min-h-[80px]">
          <div className="font-medium mb-1 text-xs text-gray-500">BD</div>
          <div className="text-sm text-gray-800 whitespace-pre-line">{bdStep}</div>
        </div>
        <div className="p-4 min-h-[80px]">
          <div className="font-medium mb-1 text-xs text-gray-500">SE and Product</div>
          <div className="text-sm text-gray-800 whitespace-pre-line">{seStep}</div>
        </div>
        <div className="p-4 min-h-[80px]">
          <div className="font-medium mb-1 text-xs text-gray-500">MKT</div>
          <div className="text-sm text-gray-800 whitespace-pre-line">{mktStep}</div>
        </div>
      </div>
      
      {/* Deals Section */}
      {deals.length > 0 && (
        <div className="border rounded overflow-hidden">
          <div className="p-3 bg-gray-50 border-b">
            <div className="font-semibold text-sm">Active Deals</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-700">
                <tr>
                  <th className="py-2 px-3 text-left">Deal</th>
                  <th className="py-2 px-3 text-left">Stage</th>
                  <th className="py-2 px-3 text-left">Closure Date</th>
                  <th className="py-2 px-3 text-right">Amount</th> {/* Added amount column */}
                </tr>
              </thead>
              <tbody>
                {deals.map((deal, index) => (
                  <tr key={index} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-3">{deal.name}</td>
                    <td className="py-2 px-3">{deal.stage}</td>
                    <td className="py-2 px-3">{deal.closureDate}</td>
                    <td className="py-2 px-3 text-right">${deal.amount?.toLocaleString() || 'TBD'}</td> {/* Display amount */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
};
