import React from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface LineSeriesProps {
  data: DataPoint[];
  color: string;
  label: string;
}

interface LineChartProps {
  series: LineSeriesProps[];
  height?: number;
  width?: number;
  className?: string;
  yAxisMax?: number;
}

export function LineChart({ 
  series, 
  height = 250, 
  width = 500,
  className = '',
  yAxisMax
}: LineChartProps) {
  // Calculate the maximum value for the y-axis
  const allValues = series.flatMap(s => s.data.map(d => d.value));
  const maxValue = yAxisMax || Math.max(...allValues, 10) * 1.1; // Add 10% padding
  
  // Get all unique labels
  const allLabels = Array.from(
    new Set(series.flatMap(s => s.data.map(d => d.label)))
  ).sort();
  
  // Chart dimensions
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Scale data points to fit in the chart
  const scaleX = (index: number) => {
    return (index / (allLabels.length - 1)) * chartWidth;
  };
  
  const scaleY = (value: number) => {
    return chartHeight - (value / maxValue) * chartHeight;
  };
  
  // Generate path for each series
  const generatePath = (seriesData: DataPoint[]) => {
    const sortedData = [...seriesData].sort((a, b) => 
      allLabels.indexOf(a.label) - allLabels.indexOf(b.label)
    );
    
    return sortedData.map((point, index) => {
      const x = scaleX(allLabels.indexOf(point.label));
      const y = scaleY(point.value);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };
  
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <g transform={`translate(${padding.left}, ${padding.top})`}>
        {/* X-axis */}
        <line 
          x1="0" 
          y1={chartHeight} 
          x2={chartWidth} 
          y2={chartHeight} 
          stroke="#e5e7eb" 
          strokeWidth="1"
        />
        
        {/* Y-axis */}
        <line 
          x1="0" 
          y1="0" 
          x2="0" 
          y2={chartHeight} 
          stroke="#e5e7eb" 
          strokeWidth="1"
        />
        
        {/* X-axis labels */}
        {allLabels.map((label, index) => (
          <text
            key={`x-label-${index}`}
            x={scaleX(index)}
            y={chartHeight + 20}
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
          >
            {label}
          </text>
        ))}
        
        {/* Y-axis labels */}
        {[0, maxValue/2, maxValue].map((value, index) => (
          <text
            key={`y-label-${index}`}
            x="-10"
            y={scaleY(value)}
            textAnchor="end"
            alignmentBaseline="middle"
            fontSize="12"
            fill="#6b7280"
          >
            {Math.round(value)}
          </text>
        ))}
        
        {/* Horizontal grid lines */}
        {[maxValue/4, maxValue/2, maxValue*3/4].map((value, index) => (
          <line
            key={`grid-${index}`}
            x1="0"
            y1={scaleY(value)}
            x2={chartWidth}
            y2={scaleY(value)}
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
        ))}
        
        {/* Data lines and points */}
        {series.map((s, seriesIndex) => (
          <g key={`series-${seriesIndex}`}>
            <path
              d={generatePath(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            
            {s.data.map((point, pointIndex) => {
              const x = scaleX(allLabels.indexOf(point.label));
              const y = scaleY(point.value);
              return (
                <circle
                  key={`point-${seriesIndex}-${pointIndex}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="white"
                  stroke={s.color}
                  strokeWidth="2"
                />
              );
            })}
          </g>
        ))}
      </g>
      
      {/* Legend */}
      <g transform={`translate(${padding.left}, ${height - 15})`}>
        {series.map((s, index) => (
          <g key={`legend-${index}`} transform={`translate(${index * 100}, 0)`}>
            <line 
              x1="0" 
              y1="0" 
              x2="20" 
              y2="0" 
              stroke={s.color} 
              strokeWidth="3" 
              strokeLinecap="round"
            />
            <text 
              x="25" 
              y="5" 
              fontSize="12" 
              fill="#6b7280"
            >
              {s.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
