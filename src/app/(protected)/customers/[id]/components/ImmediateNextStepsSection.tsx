import React from "react";
import { Card } from "@/components/ui/card";

interface ImmediateNextStepsSectionProps {
  bdStep: string;
  seStep: string;
  mktStep: string;
}

export const ImmediateNextStepsSection: React.FC<ImmediateNextStepsSectionProps> = ({
  bdStep,
  seStep,
  mktStep,
}) => {
  return (
    <Card className="p-4 my-8">
      <div className="font-semibold mb-3 text-sm">Immediate Next Steps</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-x border rounded overflow-hidden min-h-[100px]">
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
    </Card>
  );
};
