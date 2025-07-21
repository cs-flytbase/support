import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Eye, EyeOff } from 'lucide-react';
import { FlightTypeClassification } from '@/types/flytbase';

interface FlightTypeChartProps {
  flightsByType: FlightTypeClassification[];
}

const COLORS = {
  VLOS: '#3B82F6', // Blue
  BVLOS: '#8B5CF6' // Purple
};

export default function FlightTypeChart({ flightsByType }: FlightTypeChartProps) {
  const totalHours = flightsByType.reduce((sum, type) => sum + type.hours, 0);
  const totalFlights = flightsByType.reduce((sum, type) => sum + type.count, 0);

  const chartData = flightsByType.map(type => ({
    name: type.type,
    value: type.hours,
    count: type.count,
    percentage: totalHours > 0 ? ((type.hours / totalHours) * 100).toFixed(1) : '0'
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p>Hours: {data.value.toFixed(1)}h</p>
          <p>Flights: {data.count}</p>
          <p>Percentage: {data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={14}
        fontWeight="bold"
      >
        {`${percentage}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="h-5 w-5" />
          <span>Flight Classification</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Pie Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={CustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[entry.name as keyof typeof COLORS]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-4">
            {flightsByType.map((type) => (
              <div 
                key={type.type} 
                className="p-4 rounded-lg border"
                style={{ 
                  borderColor: COLORS[type.type as keyof typeof COLORS],
                  backgroundColor: `${COLORS[type.type as keyof typeof COLORS]}10`
                }}
              >
                <div className="flex items-center space-x-2 mb-2">
                  {type.type === 'VLOS' ? (
                    <Eye className="h-4 w-4" style={{ color: COLORS.VLOS }} />
                  ) : (
                    <EyeOff className="h-4 w-4" style={{ color: COLORS.BVLOS }} />
                  )}
                  <span className="font-medium" style={{ color: COLORS[type.type as keyof typeof COLORS] }}>
                    {type.type}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Hours:</span>
                    <span className="font-semibold">{type.hours.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Flights:</span>
                    <span className="font-semibold">{type.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Percentage:</span>
                    <span className="font-semibold">
                      {totalHours > 0 ? ((type.hours / totalHours) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Regulatory Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Flight Hours:</span>
                <span className="ml-2 font-semibold">{totalHours.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-gray-600">Total Flights:</span>
                <span className="ml-2 font-semibold">{totalFlights}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              VLOS: Visual Line of Sight • BVLOS: Beyond Visual Line of Sight
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}