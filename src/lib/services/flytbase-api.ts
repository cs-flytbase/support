import {
  FlightLogsResponse,
  FlightFilters,
  FlightDetails,
  FlightLog,
  PilotStats,
  DroneStats,
  DashboardSummary,
  FlightTypeClassification
} from '@/types/flytbase';

export interface FlytBaseConfig {
  baseURL: string;
  token: string;
  organizationId: string;
}

export class FlytBaseAPI {
  private config: FlytBaseConfig;

  constructor(config: FlytBaseConfig) {
    this.config = config;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.config.token}`,
      'org-id': this.config.organizationId,
      'st-auth-mode': 'header',
      'rid': 'anti-csrf',
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    };
  }

  async getFlightLogs(page = 1, limit = 50, archived = false): Promise<FlightLogsResponse> {
    const response = await fetch(
      `${this.config.baseURL}/v2/flight?page=${page}&limit=${limit}&archived=${archived}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch flight logs: ${response.statusText}`);
    }

    return response.json();
  }

  async getAllFlightLogs(maxPages = 10): Promise<FlightLog[]> {
    const allFlights: FlightLog[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      try {
        const response = await this.getFlightLogs(page, 100);
        allFlights.push(...response.flightLogs);
        
        // Check if we have more pages
        const totalPages = Math.ceil(response.total.value / 100);
        hasMore = page < totalPages;
        page++;
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        hasMore = false;
      }
    }

    return allFlights;
  }

  async getFlightFilters(): Promise<FlightFilters> {
    const response = await fetch(
      `${this.config.baseURL}/v2/flight/filters`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch flight filters: ${response.statusText}`);
    }

    return response.json();
  }

  async getFlightDetails(flightId: string): Promise<FlightDetails> {
    const response = await fetch(
      `${this.config.baseURL}/v2/flight/${flightId}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch flight details: ${response.statusText}`);
    }

    return response.json();
  }

  // Analytics computation methods
  calculateFlightDuration(flight: FlightLog): number {
    if (!flight.missions || flight.missions.length === 0) return 0;
    
    const mission = flight.missions[0];
    if (!mission.mission_start_time || !mission.mission_end_time) return 0;
    
    const startTime = new Date(mission.mission_start_time);
    const endTime = new Date(mission.mission_end_time);
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // Convert to hours
  }

  aggregatePilotStats(flights: FlightLog[]): PilotStats[] {
    const pilotMap = new Map<string, PilotStats>();

    flights.forEach(flight => {
      const pilotId = flight.user_id;
      const duration = this.calculateFlightDuration(flight);
      
      if (!pilotMap.has(pilotId)) {
        pilotMap.set(pilotId, {
          pilotId: pilotId,
          pilotName: flight.control_events?.drone?.[0]?.user_name || 'Unknown',
          email: flight.user_id, // Assuming email is stored in user_id or needs separate lookup
          totalHours: 0,
          totalFlights: 0,
          missions: [],
          lastFlightDate: flight.timestamp,
        });
      }

      const pilot = pilotMap.get(pilotId)!;
      pilot.totalHours += duration;
      pilot.totalFlights += 1;
      
      if (flight.missions?.[0]?.mission_name) {
        pilot.missions.push(flight.missions[0].mission_name);
      }
      
      // Update last flight date if this flight is more recent
      if (new Date(flight.timestamp) > new Date(pilot.lastFlightDate)) {
        pilot.lastFlightDate = flight.timestamp;
      }
    });

    return Array.from(pilotMap.values()).map(pilot => ({
      ...pilot,
      missions: [...new Set(pilot.missions)] // Remove duplicates
    }));
  }

  aggregateDroneStats(flights: FlightLog[]): DroneStats[] {
    const droneMap = new Map<string, DroneStats>();

    flights.forEach(flight => {
      const droneId = flight.drone_details.drone_id;
      const duration = this.calculateFlightDuration(flight);
      
      if (!droneMap.has(droneId)) {
        droneMap.set(droneId, {
          droneId: droneId,
          droneName: flight.drone_details.drone_name,
          droneModel: flight.drone_details.drone_model,
          totalHours: 0,
          totalFlights: 0,
          utilizationRate: 0,
          lastFlightDate: flight.timestamp,
          batteryInfo: flight.drone_details.drone_batteries?.[0] ? {
            cycles: flight.drone_details.drone_batteries[0].charge_cycles,
            serialNumber: flight.drone_details.drone_batteries[0].serial_number
          } : undefined
        });
      }

      const drone = droneMap.get(droneId)!;
      drone.totalHours += duration;
      drone.totalFlights += 1;
      
      // Update last flight date if this flight is more recent
      if (new Date(flight.timestamp) > new Date(drone.lastFlightDate)) {
        drone.lastFlightDate = flight.timestamp;
      }
    });

    // Calculate utilization rate (simplified - could be enhanced with operational hours)
    const droneStats = Array.from(droneMap.values());
    const maxHours = Math.max(...droneStats.map(d => d.totalHours));
    
    return droneStats.map(drone => ({
      ...drone,
      utilizationRate: maxHours > 0 ? (drone.totalHours / maxHours) * 100 : 0
    }));
  }

  classifyFlightType(flight: FlightLog): 'VLOS' | 'BVLOS' {
    // This is a simplified classification
    // In reality, you'd need more sophisticated logic based on actual flight data
    const distance = flight.missions?.[0]?.mission_length || 0;
    return distance > 500 ? 'BVLOS' : 'VLOS'; // 500m as threshold
  }

  generateDashboardSummary(flights: FlightLog[]): DashboardSummary {
    const pilotStats = this.aggregatePilotStats(flights);
    const droneStats = this.aggregateDroneStats(flights);
    
    const totalFlightHours = flights.reduce((sum, flight) => 
      sum + this.calculateFlightDuration(flight), 0
    );
    
    const flightsByType = flights.reduce((acc, flight) => {
      const type = this.classifyFlightType(flight);
      const duration = this.calculateFlightDuration(flight);
      
      const existing = acc.find(item => item.type === type);
      if (existing) {
        existing.count += 1;
        existing.hours += duration;
      } else {
        acc.push({ type, count: 1, hours: duration });
      }
      
      return acc;
    }, [] as FlightTypeClassification[]);

    // Generate monthly trends
    const monthlyMap = new Map<string, { flights: number; hours: number }>();
    flights.forEach(flight => {
      const date = new Date(flight.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { flights: 0, hours: 0 });
      }
      
      const monthData = monthlyMap.get(monthKey)!;
      monthData.flights += 1;
      monthData.hours += this.calculateFlightDuration(flight);
    });

    const monthlyTrends = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalFlightHours,
      totalFlights: flights.length,
      activePilots: pilotStats.length,
      activeDrones: droneStats.length,
      averageFlightDuration: flights.length > 0 ? totalFlightHours / flights.length : 0,
      flightsByType,
      monthlyTrends
    };
  }

  filterFlightsByDateRange(flights: FlightLog[], startDate: Date, endDate: Date): FlightLog[] {
    return flights.filter(flight => {
      const flightDate = new Date(flight.timestamp);
      return flightDate >= startDate && flightDate <= endDate;
    });
  }
}

// Factory function for creating API instance
export function createFlytBaseAPI(token: string, organizationId: string): FlytBaseAPI {
  return new FlytBaseAPI({
    baseURL: 'https://api.flytbase.com',
    token,
    organizationId
  });
}