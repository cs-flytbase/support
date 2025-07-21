'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, Filter, Plane, Users, Clock, BarChart3, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Components
import FlightSummaryCards from '@/components/flight-analytics/FlightSummaryCards';
import FlightTrendsChart from '@/components/flight-analytics/FlightTrendsChart';
import PilotAnalytics from '@/components/flight-analytics/PilotAnalytics';
import DroneAnalytics from '@/components/flight-analytics/DroneAnalytics';
import FlightTypeChart from '@/components/flight-analytics/FlightTypeChart';
import ExportPanel from '@/components/flight-analytics/ExportPanel';
import DateRangeFilter from '@/components/flight-analytics/DateRangeFilter';
import FlightLogsTable from '@/components/flight-analytics/FlightLogsTable';

// Types and Services
import { 
  FlightLog, 
  PilotStats, 
  DroneStats, 
  DashboardSummary, 
  TimeFilter 
} from '@/types/flytbase';
import { FlytBaseAPI, createFlytBaseAPI } from '@/lib/services/flytbase-api';

// Mock data for demo purposes - replace with actual API configuration
const DEMO_API_CONFIG = {
  token: process.env.NEXT_PUBLIC_FLYTBASE_TOKEN || 'demo-token',
  organizationId: process.env.NEXT_PUBLIC_FLYTBASE_ORG_ID || 'demo-org'
};

const TIME_FILTERS: TimeFilter[] = [
  { label: 'Last 7 days', value: 'week', days: 7 },
  { label: 'Last 30 days', value: 'month', days: 30 },
  { label: 'Last 3 months', value: 'quarter', days: 90 },
  { label: 'Last 12 months', value: 'year', days: 365 },
  { label: 'Year to date', value: 'ytd' },
  { label: 'Custom range', value: 'custom' }
];

export default function FlightAnalyticsDashboard() {
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [flightLogs, setFlightLogs] = useState<FlightLog[]>([]);
  const [filteredFlights, setFilteredFlights] = useState<FlightLog[]>([]);
  const [pilotStats, setPilotStats] = useState<PilotStats[]>([]);
  const [droneStats, setDroneStats] = useState<DroneStats[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter>(TIME_FILTERS[1]); // Default to last 30 days
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  const [api, setApi] = useState<FlytBaseAPI | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Initialize API
  useEffect(() => {
    const apiInstance = createFlytBaseAPI(DEMO_API_CONFIG.token, DEMO_API_CONFIG.organizationId);
    setApi(apiInstance);
  }, []);

  // Load initial data
  useEffect(() => {
    if (api) {
      loadFlightData();
    }
  }, [api, selectedTimeFilter, customDateRange]);

  const loadFlightData = async () => {
    if (!api) return;
    
    setLoading(true);
    try {
      // For demo purposes, we'll generate mock data
      // In production, uncomment the actual API calls below
      
      // const allFlights = await api.getAllFlightLogs();
      // setFlightLogs(allFlights);
      
      // Generate mock data for demo
      const mockFlights = generateMockFlightData();
      setFlightLogs(mockFlights);
      
      // Apply date filtering
      applyDateFilter(mockFlights);
      
      toast({
        title: "Data loaded successfully",
        description: `Loaded ${mockFlights.length} flight records`
      });
    } catch (error) {
      console.error('Error loading flight data:', error);
      toast({
        title: "Error loading data",
        description: "Using demo data for display",
        variant: "destructive"
      });
      
      // Fallback to mock data
      const mockFlights = generateMockFlightData();
      setFlightLogs(mockFlights);
      applyDateFilter(mockFlights);
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = (flights: FlightLog[]) => {
    if (!api) return;
    
    let startDate: Date;
    let endDate = new Date();
    
    if (selectedTimeFilter.value === 'custom') {
      startDate = customDateRange.start;
      endDate = customDateRange.end;
    } else if (selectedTimeFilter.value === 'ytd') {
      startDate = new Date(endDate.getFullYear(), 0, 1);
    } else if (selectedTimeFilter.days) {
      startDate = new Date(Date.now() - selectedTimeFilter.days * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const filtered = api.filterFlightsByDateRange(flights, startDate, endDate);
    setFilteredFlights(filtered);
    
    // Generate analytics
    const pilots = api.aggregatePilotStats(filtered);
    const drones = api.aggregateDroneStats(filtered);
    const summary = api.generateDashboardSummary(filtered);
    
    setPilotStats(pilots);
    setDroneStats(drones);
    setDashboardSummary(summary);
  };

  const generateMockFlightData = (): FlightLog[] => {
    // Generate realistic mock data for demonstration
    const mockFlights: FlightLog[] = [];
    const pilots = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson'];
    const drones = ['Alpha-01', 'Beta-02', 'Charlie-03', 'Delta-04'];
    const sites = ['Site Alpha', 'Site Beta', 'Site Charlie'];
    const missions = ['Inspection', 'Surveillance', 'Mapping', 'Emergency Response'];
    
    for (let i = 0; i < 150; i++) {
      const date = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      const pilot = pilots[Math.floor(Math.random() * pilots.length)];
      const drone = drones[Math.floor(Math.random() * drones.length)];
      const site = sites[Math.floor(Math.random() * sites.length)];
      const mission = missions[Math.floor(Math.random() * missions.length)];
      
      const missionStart = new Date(date.getTime() + Math.random() * 12 * 60 * 60 * 1000);
      const missionDuration = (15 + Math.random() * 45) * 60 * 1000; // 15-60 minutes
      const missionEnd = new Date(missionStart.getTime() + missionDuration);
      
      mockFlights.push({
        flight_id: `flight_${i + 1}`,
        timestamp: date.toISOString(),
        user_id: `user_${pilots.indexOf(pilot) + 1}`,
        organization_id: 'demo-org',
        edge_flight_id: `edge_${i + 1}`,
        media_upload_status: Math.floor(Math.random() * 4),
        total_media: Math.floor(Math.random() * 20),
        uploaded_media: Math.floor(Math.random() * 15),
        site_details: {
          site_id: `site_${sites.indexOf(site) + 1}`,
          site_name: site
        },
        drone_details: {
          drone_id: `drone_${drones.indexOf(drone) + 1}`,
          drone_name: drone,
          drone_type: 'Quadcopter',
          drone_manufacturer: 'DJI',
          drone_model: 'Matrice 300',
          drone_hardware_id: `hw_${i + 1}`,
          drone_firmware_version: '1.0.0',
          drone_batteries: [{
            index: 0,
            charge_cycles: 50 + Math.floor(Math.random() * 200),
            serial_number: `bat_${i + 1}`,
            firmware_version: '1.0.0'
          }]
        },
        missions: [{
          mission_id: `mission_${i + 1}`,
          mission_name: mission,
          type: mission,
          finish_action: 'RTH',
          no_of_waypoints: Math.floor(Math.random() * 10) + 1,
          mission_length: 200 + Math.random() * 800, // meters
          mission_start_time: missionStart.toISOString(),
          mission_end_time: missionEnd.toISOString(),
          waypoints: []
        }],
        docking_station: {
          docking_station_id: `dock_${Math.floor(Math.random() * 3) + 1}`,
          docking_station_name: `Dock ${Math.floor(Math.random() * 3) + 1}`,
          docking_station_location: {
            latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
            longitude: -122.4194 + (Math.random() - 0.5) * 0.1
          }
        },
        control_events: {
          drone: [{
            timestamp: missionStart.toISOString(),
            user_id: `user_${pilots.indexOf(pilot) + 1}`,
            user_name: pilot
          }]
        }
      });
    }
    
    return mockFlights;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading flight analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flight Analytics Dashboard</h1>
          <p className="text-gray-600">
            Comprehensive flight data analysis and regulatory reporting
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <DateRangeFilter
            selectedFilter={selectedTimeFilter}
            customRange={customDateRange}
            onFilterChange={setSelectedTimeFilter}
            onCustomRangeChange={setCustomDateRange}
            timeFilters={TIME_FILTERS}
          />
          <ExportPanel
            flightLogs={filteredFlights}
            pilotStats={pilotStats}
            droneStats={droneStats}
            dashboardSummary={dashboardSummary}
            dateRange={customDateRange}
          />
        </div>
      </div>

      {/* Summary Cards */}
      {dashboardSummary && (
        <FlightSummaryCards 
          summary={dashboardSummary}
          loading={loading}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="pilots" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Pilots</span>
          </TabsTrigger>
          <TabsTrigger value="drones" className="flex items-center space-x-2">
            <Plane className="h-4 w-4" />
            <span>Drones</span>
          </TabsTrigger>
          <TabsTrigger value="flights" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Flight Logs</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Compliance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dashboardSummary && (
              <>
                <FlightTrendsChart 
                  monthlyTrends={dashboardSummary.monthlyTrends}
                />
                <FlightTypeChart 
                  flightsByType={dashboardSummary.flightsByType}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pilots">
          <PilotAnalytics 
            pilots={pilotStats}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="drones">
          <DroneAnalytics 
            drones={droneStats}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="flights">
          <FlightLogsTable 
            flights={filteredFlights}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Compliance Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Asheville Police Department</h3>
                  <p className="text-sm text-gray-600 mb-4">FAA & Police Reporting</p>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        // Generate FAA compliance report
                        toast({
                          title: "Generating FAA Report",
                          description: "Pilot-specific flight statistics report"
                        });
                      }}
                    >
                      Generate FAA Report
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        // Generate police report
                        toast({
                          title: "Generating Police Report",
                          description: "Mission summary and pilot performance"
                        });
                      }}
                    >
                      Generate Police Report
                    </Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Statnett Norway</h3>
                  <p className="text-sm text-gray-600 mb-4">Annual Regulatory Report</p>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "Generating Annual Report",
                          description: "VLOS/BVLOS hours and pilot tracking"
                        });
                      }}
                    >
                      Generate Annual Report
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "Exporting Data",
                          description: "CSV, Excel, KML formats"
                        });
                      }}
                    >
                      Export Data
                    </Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Quellaveco Mining</h3>
                  <p className="text-sm text-gray-600 mb-4">Monthly DGAC Reports</p>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "Generating Monthly Report",
                          description: "Flight hours by drone and pilot"
                        });
                      }}
                    >
                      Generate Monthly Report
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "Automated Report Setup",
                          description: "Configure monthly automation"
                        });
                      }}
                    >
                      Setup Automation
                    </Button>
                  </div>
                </Card>
              </div>

              {dashboardSummary && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Compliance Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {dashboardSummary.flightsByType.find(t => t.type === 'VLOS')?.hours.toFixed(1) || '0'}h
                      </div>
                      <div className="text-sm text-blue-600">VLOS Hours</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {dashboardSummary.flightsByType.find(t => t.type === 'BVLOS')?.hours.toFixed(1) || '0'}h
                      </div>
                      <div className="text-sm text-purple-600">BVLOS Hours</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {dashboardSummary.activePilots}
                      </div>
                      <div className="text-sm text-green-600">Certified Pilots</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {dashboardSummary.activeDrones}
                      </div>
                      <div className="text-sm text-orange-600">Active Aircraft</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}