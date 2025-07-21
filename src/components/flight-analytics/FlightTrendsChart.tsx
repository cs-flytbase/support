import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface FlightTrendsChartProps {
  monthlyTrends: Array<{
    month: string;
    flights: number;
    hours: number;
  }>;
}

export default function FlightTrendsChart({ monthlyTrends }: FlightTrendsChartProps) {
  // Format month labels for better display
  const formattedData = monthlyTrends.map(item => ({
    ...item,
    monthLabel: new Date(item.month + '-01').toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    })
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'flights' 
                ? `Flights: ${entry.value}`
                : `Hours: ${entry.value.toFixed(1)}h`
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Flight Trends</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Flight Count Trend */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Flight Count</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="monthLabel" 
                  fontSize={12}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fill: '#6B7280' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="flights" 
                  fill="#3B82F6" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Flight Hours Trend */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Flight Hours</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="monthLabel" 
                  fontSize={12}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fill: '#6B7280' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}