import React from "react";
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
        {quarterlyPipelines.map((q) => (
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

      {/* Immediate Deals Table */}
      <Card className="p-4 min-w-[300px]">
        <div className="font-semibold mb-2">Immediate Deals (3 Months)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-y-1">
            <thead>
              <tr>
                <th className="text-left font-medium">Deal</th>
                <th className="text-left font-medium">Stage</th>
                <th className="text-left font-medium">Date of Closure</th>
              </tr>
            </thead>
            <tbody>
              {immediateDeals.map((deal, i) => (
                <tr key={deal.name + i} className="border-b last:border-b-0">
                  <td>{deal.name}</td>
                  <td>{deal.stage}</td>
                  <td>{deal.closureDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination Placeholder */}
          <div className="flex justify-end mt-2 text-xs text-gray-500 gap-2">
            <span className="cursor-pointer">1</span>
            <span className="cursor-pointer">2</span>
          </div>
        </div>
      </Card>

      {/* Business Enabler */}
      <Card className="p-4 min-w-[200px]">
        <div className="font-semibold mb-2">Business Enabler</div>
        <ul className="list-disc list-inside text-sm text-gray-700">
          {businessEnablers.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
