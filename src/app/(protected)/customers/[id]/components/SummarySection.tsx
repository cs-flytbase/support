import React from "react";
import { Card } from "@/components/ui/card";

interface StrategicCustomer {
  name: string;
  docks: number;
  arr: number;
}

interface SummarySectionProps {
  fcRemaining: number;
  fcBought: number;
  fcConsumed: number;
  fcConsumedMTD: number;
  fcConsumedYTD: number;
  strategicCustomers: StrategicCustomer[];
  growthEnablers: string[];
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  fcRemaining,
  fcBought,
  fcConsumed,
  fcConsumedMTD,
  fcConsumedYTD,
  strategicCustomers,
  growthEnablers,
}) => {
  const totalDocks = strategicCustomers.reduce((acc, c) => acc + c.docks, 0);
  const totalARR = strategicCustomers.reduce((acc, c) => acc + c.arr, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
      {/* FC Summary */}
      <Card className="p-4 flex flex-col gap-2 min-w-[200px]">
        <div className="flex justify-between text-sm font-medium">
          <span>FC Remaining.</span>
          <span>{fcRemaining}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Lifetime FC Bought:</span>
          <span>{fcBought}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Lifetime FC Consumed:</span>
          <span>{fcConsumed}</span>
        </div>
        <div className="border rounded p-2 mb-2 bg-gray-50">
          <div className="text-xs font-semibold">This Month (June, 2025)</div>
          <div className="flex justify-between text-xs">
            <span>FC Consumed (MTD):</span>
            <span>{fcConsumedMTD}</span>
          </div>
        </div>
        <div className="border rounded p-2 bg-gray-50">
          <div className="text-xs font-semibold">This Year (2025)</div>
          <div className="flex justify-between text-xs">
            <span>FC Consumed (YTD):</span>
            <span>{fcConsumedYTD}</span>
          </div>
        </div>
      </Card>

      {/* Strategic Customers Table */}
      <Card className="p-4 min-w-[300px]">
        <div className="font-semibold mb-2">Strategic Customers</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-y-1">
            <thead>
              <tr className="border-b">
                <th className="font-medium text-left">&nbsp;</th>
                <th className="font-medium text-left">Docks on FlytBase</th>
                <th className="font-medium text-left">ARR</th>
              </tr>
            </thead>
            <tbody>
              {strategicCustomers.map((c, i) => (
                <tr key={c.name} className="border-b last:border-b-0">
                  <td>{c.name}</td>
                  <td>{c.docks}</td>
                  <td>{c.arr.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td>Total Docks on FlytBase</td>
                <td>{totalDocks}</td>
                <td>{totalARR.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Growth Enablers */}
      <Card className="p-4 min-w-[200px]">
        <div className="font-semibold mb-2">Growth Enablers</div>
        <ul className="list-disc list-inside text-sm text-gray-700">
          {growthEnablers.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
