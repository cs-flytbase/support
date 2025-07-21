import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Plane, User, MapPin, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { FlightLog } from '@/types/flytbase';
import { DataExporter } from '@/lib/export';

interface FlightLogsTableProps {
  flights: FlightLog[];
  loading: boolean;
}

export default function FlightLogsTable({ flights, loading }: FlightLogsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'pilot' | 'drone' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [filterMission, setFilterMission] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Get unique sites and missions for filtering
  const sites = useMemo(() => {
    const siteSet = new Set(flights.map(f => f.site_details.site_name));
    return Array.from(siteSet).sort();
  }, [flights]);

  const missions = useMemo(() => {
    const missionSet = new Set(flights.flatMap(f => f.missions.map(m => m.type)).filter(Boolean));
    return Array.from(missionSet).sort();
  }, [flights]);

  // Filter and sort flights
  const filteredFlights = useMemo(() => {
    return flights
      .filter(flight => {
        const matchesSearch = 
          flight.drone_details.drone_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          flight.site_details.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          flight.control_events?.drone?.[0]?.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          flight.missions?.[0]?.mission_name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesSite = filterSite === 'all' || flight.site_details.site_name === filterSite;
        const matchesMission = filterMission === 'all' || flight.missions?.[0]?.type === filterMission;
        
        return matchesSearch && matchesSite && matchesMission;
      })
      .sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'date':
            aValue = new Date(a.timestamp);
            bValue = new Date(b.timestamp);
            break;
          case 'pilot':
            aValue = a.control_events?.drone?.[0]?.user_name || '';
            bValue = b.control_events?.drone?.[0]?.user_name || '';
            break;
          case 'drone':
            aValue = a.drone_details.drone_name;
            bValue = b.drone_details.drone_name;
            break;
          case 'duration':
            aValue = calculateDuration(a);
            bValue = calculateDuration(b);
            break;
          default:
            aValue = new Date(a.timestamp);
            bValue = new Date(b.timestamp);
        }
        
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortOrder === 'asc' 
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime();
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      });
  }, [flights, searchTerm, sortBy, sortOrder, filterSite, filterMission]);

  // Pagination
  const totalPages = Math.ceil(filteredFlights.length / itemsPerPage);
  const paginatedFlights = filteredFlights.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const calculateDuration = (flight: FlightLog): number => {
    if (!flight.missions || flight.missions.length === 0) return 0;
    const mission = flight.missions[0];
    if (!mission.mission_start_time || !mission.mission_end_time) return 0;
    
    const startTime = new Date(mission.mission_start_time);
    const endTime = new Date(mission.mission_end_time);
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes.toFixed(0)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toFixed(0)}m`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSort = (field: 'date' | 'pilot' | 'drone' | 'duration') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getMissionTypeColor = (type: string): string => {
    switch (type?.toLowerCase()) {
      case 'inspection': return 'bg-blue-100 text-blue-800';
      case 'surveillance': return 'bg-purple-100 text-purple-800';
      case 'mapping': return 'bg-green-100 text-green-800';
      case 'emergency response': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Flight Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 10 }).map((_, index) => (
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
            <Clock className="h-5 w-5" />
            <span>Flight Logs ({filteredFlights.length} flights)</span>
          </CardTitle>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => DataExporter.exportFlightsToCSV(filteredFlights)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search flights..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <Select value={filterSite} onValueChange={setFilterSite}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site} value={site}>{site}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterMission} onValueChange={setFilterMission}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by mission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Missions</SelectItem>
                {missions.map(mission => (
                  <SelectItem key={mission} value={mission}>{mission}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-sm text-gray-600">Sort by:</span>
          <Button
            variant={sortBy === 'date' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('date')}
          >
            Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            variant={sortBy === 'pilot' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('pilot')}
          >
            Pilot {sortBy === 'pilot' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            variant={sortBy === 'drone' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('drone')}
          >
            Drone {sortBy === 'drone' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            variant={sortBy === 'duration' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('duration')}
          >
            Duration {sortBy === 'duration' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
        </div>

        {/* Flight Table */}
        <div className="space-y-3">
          {paginatedFlights.map((flight) => (
            <Card key={flight.flight_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-4">
                      <h3 className="font-semibold">{flight.flight_id}</h3>
                      <Badge className={getMissionTypeColor(flight.missions?.[0]?.type || '')}>
                        {flight.missions?.[0]?.type || 'Unknown'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>{flight.control_events?.drone?.[0]?.user_name || 'Unknown Pilot'}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Plane className="h-4 w-4 text-gray-500" />
                        <span>{flight.drone_details.drone_name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{flight.site_details.site_name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>{formatDuration(calculateDuration(flight))}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {formatDate(flight.timestamp)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {flight.missions?.[0]?.mission_name || 'Manual Flight'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {flight.missions?.[0]?.no_of_waypoints || 0} waypoints
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {flight.total_media} media
                      </div>
                      <div className="text-xs text-gray-500">
                        {flight.uploaded_media} uploaded
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredFlights.length)} of{' '}
              {filteredFlights.length} flights
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {filteredFlights.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No flights found matching your criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}