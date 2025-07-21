import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plane, Clock, Activity, Search, Download, Battery } from 'lucide-react';
import { DroneStats } from '@/types/flytbase';
import { DataExporter } from '@/lib/export';

interface DroneAnalyticsProps {
  drones: DroneStats[];
  loading: boolean;
}

export default function DroneAnalytics({ drones, loading }: DroneAnalyticsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'hours' | 'flights' | 'utilization' | 'name'>('utilization');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort drones
  const filteredDrones = drones
    .filter(drone => 
      drone.droneName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drone.droneModel.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'hours':
          aValue = a.totalHours;
          bValue = b.totalHours;
          break;
        case 'flights':
          aValue = a.totalFlights;
          bValue = b.totalFlights;
          break;
        case 'utilization':
          aValue = a.utilizationRate;
          bValue = b.utilizationRate;
          break;
        case 'name':
          aValue = a.droneName;
          bValue = b.droneName;
          break;
        default:
          aValue = a.utilizationRate;
          bValue = b.utilizationRate;
      }
      
      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }
      
      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

  const handleSort = (field: 'hours' | 'flights' | 'utilization' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatHours = (hours: number) => `${hours.toFixed(1)}h`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    if (rate >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getBatteryHealthColor = (cycles: number) => {
    if (cycles < 100) return 'text-green-600';
    if (cycles < 200) return 'text-yellow-600';
    if (cycles < 300) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Drone Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <CardTitle className="flex items-center space-x-2">
            <Plane className="h-5 w-5" />
            <span>Drone Analytics ({drones.length} drones)</span>
          </CardTitle>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search drones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => DataExporter.exportDronesToCSV(filteredDrones)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {drones.reduce((sum, drone) => sum + drone.totalHours, 0).toFixed(1)}h
            </div>
            <div className="text-sm text-blue-600">Total Hours</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {drones.reduce((sum, drone) => sum + drone.totalFlights, 0)}
            </div>
            <div className="text-sm text-green-600">Total Flights</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {drones.length > 0 ? (drones.reduce((sum, drone) => sum + drone.utilizationRate, 0) / drones.length).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-purple-600">Avg Utilization</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {drones.filter(d => d.utilizationRate > 80).length}
            </div>
            <div className="text-sm text-orange-600">High Utilization</div>
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-sm text-gray-600">Sort by:</span>
          <Button
            variant={sortBy === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('name')}
          >
            Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            variant={sortBy === 'hours' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('hours')}
          >
            Hours {sortBy === 'hours' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            variant={sortBy === 'flights' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('flights')}
          >
            Flights {sortBy === 'flights' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            variant={sortBy === 'utilization' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('utilization')}
          >
            Utilization {sortBy === 'utilization' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
        </div>

        {/* Drones List */}
        <div className="space-y-4">
          {filteredDrones.map((drone) => (
            <Card key={drone.droneId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-4">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{drone.droneName}</h3>
                      <p className="text-sm text-gray-600">{drone.droneModel}</p>
                      <p className="text-xs text-gray-500">Last flight: {formatDate(drone.lastFlightDate)}</p>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="flex items-center space-x-1 text-blue-600">
                          <Clock className="h-4 w-4" />
                          <span className="font-semibold">{formatHours(drone.totalHours)}</span>
                        </div>
                        <div className="text-xs text-gray-500">Flight Hours</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center space-x-1 text-green-600">
                          <Activity className="h-4 w-4" />
                          <span className="font-semibold">{drone.totalFlights}</span>
                        </div>
                        <div className="text-xs text-gray-500">Flights</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-semibold text-purple-600">
                          {drone.totalFlights > 0 ? (drone.totalHours / drone.totalFlights).toFixed(1) : '0'}h
                        </div>
                        <div className="text-xs text-gray-500">Avg Duration</div>
                      </div>
                    </div>
                  </div>

                  {/* Utilization */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Utilization Rate</span>
                      <span className={`text-sm font-semibold ${getUtilizationColor(drone.utilizationRate)}`}>
                        {drone.utilizationRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={drone.utilizationRate} className="h-2" />
                  </div>

                  {/* Battery Info */}
                  {drone.batteryInfo && (
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Battery className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-600">Battery Cycles:</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold ${getBatteryHealthColor(drone.batteryInfo.cycles)}`}>
                          {drone.batteryInfo.cycles}
                        </span>
                        <Badge 
                          variant={drone.batteryInfo.cycles < 200 ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {drone.batteryInfo.cycles < 100 ? 'Excellent' : 
                           drone.batteryInfo.cycles < 200 ? 'Good' : 
                           drone.batteryInfo.cycles < 300 ? 'Fair' : 'Replace Soon'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDrones.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No drones found matching your search criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}