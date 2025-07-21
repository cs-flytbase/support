import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Activity, Search, Download } from 'lucide-react';
import { PilotStats } from '@/types/flytbase';
import { DataExporter } from '@/lib/export';

interface PilotAnalyticsProps {
  pilots: PilotStats[];
  loading: boolean;
}

export default function PilotAnalytics({ pilots, loading }: PilotAnalyticsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'hours' | 'flights' | 'name'>('hours');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort pilots
  const filteredPilots = pilots
    .filter(pilot => 
      pilot.pilotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pilot.email.toLowerCase().includes(searchTerm.toLowerCase())
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
        case 'name':
          aValue = a.pilotName;
          bValue = b.pilotName;
          break;
        default:
          aValue = a.totalHours;
          bValue = b.totalHours;
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

  const handleSort = (field: 'hours' | 'flights' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatHours = (hours: number) => `${hours.toFixed(1)}h`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pilot Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 bg-gray-200 rounded"></div>
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
            <Users className="h-5 w-5" />
            <span>Pilot Analytics ({pilots.length} pilots)</span>
          </CardTitle>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search pilots..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => DataExporter.exportPilotsToCSV(filteredPilots)}
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
              {pilots.reduce((sum, pilot) => sum + pilot.totalHours, 0).toFixed(1)}h
            </div>
            <div className="text-sm text-blue-600">Total Hours</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {pilots.reduce((sum, pilot) => sum + pilot.totalFlights, 0)}
            </div>
            <div className="text-sm text-green-600">Total Flights</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {pilots.length > 0 ? (pilots.reduce((sum, pilot) => sum + pilot.totalHours, 0) / pilots.length).toFixed(1) : 0}h
            </div>
            <div className="text-sm text-purple-600">Avg Hours/Pilot</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {pilots.length > 0 ? Math.round(pilots.reduce((sum, pilot) => sum + pilot.totalFlights, 0) / pilots.length) : 0}
            </div>
            <div className="text-sm text-orange-600">Avg Flights/Pilot</div>
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
        </div>

        {/* Pilots List */}
        <div className="space-y-4">
          {filteredPilots.map((pilot) => (
            <Card key={pilot.pilotId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{pilot.pilotName}</h3>
                    <p className="text-sm text-gray-600">{pilot.email}</p>
                    <p className="text-xs text-gray-500">Last flight: {formatDate(pilot.lastFlightDate)}</p>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="flex items-center space-x-1 text-blue-600">
                        <Clock className="h-4 w-4" />
                        <span className="font-semibold">{formatHours(pilot.totalHours)}</span>
                      </div>
                      <div className="text-xs text-gray-500">Flight Hours</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center space-x-1 text-green-600">
                        <Activity className="h-4 w-4" />
                        <span className="font-semibold">{pilot.totalFlights}</span>
                      </div>
                      <div className="text-xs text-gray-500">Flights</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-semibold text-purple-600">
                        {pilot.totalFlights > 0 ? (pilot.totalHours / pilot.totalFlights).toFixed(1) : '0'}h
                      </div>
                      <div className="text-xs text-gray-500">Avg Duration</div>
                    </div>
                  </div>
                </div>
                
                {/* Missions */}
                {pilot.missions && pilot.missions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-2">Recent Missions:</p>
                    <div className="flex flex-wrap gap-1">
                      {pilot.missions.slice(0, 5).map((mission, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {mission}
                        </Badge>
                      ))}
                      {pilot.missions.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{pilot.missions.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPilots.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No pilots found matching your search criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}