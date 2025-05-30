import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressCircleProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
  valueClassName?: string;
  strokeClassName?: string;
  strokeWidth?: number;
  valuePrefix?: string;
  valueSuffix?: string;
}

const sizeMap = {
  sm: 80,
  md: 120,
  lg: 160,
};

export function ProgressCircle({
  value,
  max = 100,
  size = "md",
  showValue = true,
  className,
  valueClassName,
  strokeClassName,
  strokeWidth = 8,
  valuePrefix = "",
  valueSuffix = "",
}: ProgressCircleProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const circleSize = sizeMap[size];
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("relative inline-flex", className)}>
      <svg
        className="transform -rotate-90"
        width={circleSize}
        height={circleSize}
        viewBox={`0 0 ${circleSize} ${circleSize}`}
      >
        {/* Background circle */}
        <circle
          className="text-gray-200 dark:text-gray-700"
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          stroke="currentColor"
        />
        {/* Progress circle */}
        <circle
          className={cn("text-blue-500", strokeClassName)}
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      
      {showValue && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center text-2xl font-semibold",
            valueClassName
          )}
        >
          {valuePrefix}{Math.round(value)}{valueSuffix}
        </div>
      )}
    </div>
  );
}
