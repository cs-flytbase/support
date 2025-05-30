import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
  indicatorClassName?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  className,
  indicatorClassName,
  valuePrefix = "",
  valueSuffix = "",
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">{label}</span>
          {showValue && (
            <span className="text-sm font-medium">
              {valuePrefix}{Math.round(value)}{valueSuffix}
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          className={cn("h-2.5 rounded-full", indicatorClassName || "bg-blue-600")}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
