import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Plane, Users, TrendingUp, Activity } from 'lucide-react';
import { DashboardSummary } from '@/types/flytbase';

interface FlightSummaryCardsProps {
  summary: DashboardSummary;
  loading: boolean;
}

export default function FlightSummaryCards({ summary, loading }: FlightSummaryCardsProps) {
  const formatHours = (hours: number) => `${hours.toFixed(1)}h`;

  const cards = [
    {
      title: 'Total Flight Hours',
      value: formatHours(summary.totalFlightHours),
      icon: Clock,
      description: 'Total flight time',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Flights',
      value: summary.totalFlights.toString(),
      icon: Activity,
      description: 'Number of missions',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Active Pilots',
      value: summary.activePilots.toString(),
      icon: Users,
      description: 'Certified operators',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Active Drones',
      value: summary.activeDrones.toString(),
      icon: Plane,
      description: 'Fleet size',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Avg Flight Duration',
      value: formatHours(summary.averageFlightDuration),
      icon: TrendingUp,
      description: 'Per mission',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <IconComponent className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}