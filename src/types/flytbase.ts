// FlytBase API Types
export interface DroneDetails {
  drone_id: string;
  drone_name: string;
  drone_type: string;
  drone_manufacturer: string;
  drone_model: string;
  drone_hardware_id: string;
  drone_firmware_version: string;
  drone_batteries: Array<{
    index: number;
    charge_cycles: number;
    serial_number: string;
    firmware_version: string;
  }>;
}

export interface MissionDetails {
  mission_name: string;
  mission_id: string;
  type: string;
  finish_action: string;
  no_of_waypoints: number;
  mission_length: number;
  mission_start_time: string;
  mission_end_time: string;
  waypoints: Array<{
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    key: number;
  }>;
}

export interface DockingStation {
  docking_station_name: string;
  docking_station_id: string;
  docking_station_location: {
    latitude: number;
    longitude: number;
  };
}

export interface SiteDetails {
  site_id: string;
  site_name: string;
}

export interface FlightLog {
  site_details: SiteDetails;
  edge_flight_id: string;
  drone_details: DroneDetails;
  missions: MissionDetails[];
  docking_station: DockingStation;
  flight_id: string;
  organization_id: string;
  user_id: string;
  timestamp: string;
  media_upload_status: number;
  total_media: number;
  uploaded_media: number;
}

export interface FlightLogsResponse {
  flightLogs: FlightLog[];
  total: {
    value: number;
    relation: string;
  };
  page: string;
  limit: string;
}

export interface FlightFilters {
  drones: Array<{
    drone_name: string;
    drone_id: string;
  }>;
  docking_stations: Array<{
    docking_station_name: string;
    docking_station_id: string;
  }>;
  missions: Array<{
    mission_name: string;
    mission_id: string;
  }>;
  sites: Array<{
    site_name: string;
    site_id: string;
  }>;
}

export interface FlightDetails {
  site_details: SiteDetails;
  edge_flight_id: string;
  drone_details: DroneDetails;
  flight_details: {
    flight_time: number;
    max_altitude: number;
    min_altitude: number;
    max_speed: number;
    min_speed: number;
    total_distance: number;
    takeoff_time: string;
    landing_time: string;
    mission_type: string;
  };
  drone_battery: {
    start: number;
    end: number;
  };
  route_details: {
    path: string;
    no_of_waypoints: number;
    finish_action: string;
    mission_type: string;
    take_off_location: {
      altitude: number;
      latitude: number;
      longitude: number;
      yaw: number;
    };
    landing_location: {
      altitude: number;
      latitude: number;
      longitude: number;
      yaw: number;
    };
  };
  log_data: Array<{
    id: string;
    timestamp: string;
    drone_telemetry: {
      drone_battery: number;
      current_location: {
        altitude: number;
        latitude: number;
        longitude: number;
      };
      drone_mode: string;
      vertical_speed: number;
      horizontal_speed: number;
      satellite_count: number;
      distance_from_home?: number;
    };
  }>;
  control_events: {
    drone: Array<{
      timestamp: string;
      user_id: string;
      user_name: string;
    }>;
  };
  user_id: string;
  email: string;
  start_time: string;
  end_time: string;
}

// Processed Analytics Types
export interface PilotStats {
  pilotId: string;
  pilotName: string;
  email: string;
  totalHours: number;
  totalFlights: number;
  missions: string[];
  lastFlightDate: string;
}

export interface DroneStats {
  droneId: string;
  droneName: string;
  droneModel: string;
  totalHours: number;
  totalFlights: number;
  utilizationRate: number;
  lastFlightDate: string;
  batteryInfo?: {
    cycles: number;
    serialNumber: string;
  };
}

export interface FlightTypeClassification {
  type: 'VLOS' | 'BVLOS';
  count: number;
  hours: number;
}

export interface DashboardSummary {
  totalFlightHours: number;
  totalFlights: number;
  activePilots: number;
  activeDrones: number;
  averageFlightDuration: number;
  flightsByType: FlightTypeClassification[];
  monthlyTrends: Array<{
    month: string;
    flights: number;
    hours: number;
  }>;
}

export interface TimeFilter {
  label: string;
  value: string;
  days?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  data: 'pilots' | 'drones' | 'flights' | 'summary';
  dateRange: {
    start: Date;
    end: Date;
  };
}