import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parse } from 'papaparse';
import { PilotStats, DroneStats, FlightLog, DashboardSummary } from '@/types/flytbase';

export class DataExporter {
  static formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  static formatHours(hours: number): string {
    return `${hours.toFixed(2)}h`;
  }

  // CSV Export Functions
  static exportPilotsToCSV(pilots: PilotStats[]): void {
    const csvData = pilots.map(pilot => ({
      'Pilot ID': pilot.pilotId,
      'Pilot Name': pilot.pilotName,
      'Email': pilot.email,
      'Total Hours': this.formatHours(pilot.totalHours),
      'Total Flights': pilot.totalFlights,
      'Missions': pilot.missions.join('; '),
      'Last Flight': this.formatDate(pilot.lastFlightDate)
    }));

    this.downloadCSV(csvData, 'pilot-statistics.csv');
  }

  static exportDronesToCSV(drones: DroneStats[]): void {
    const csvData = drones.map(drone => ({
      'Drone ID': drone.droneId,
      'Drone Name': drone.droneName,
      'Model': drone.droneModel,
      'Total Hours': this.formatHours(drone.totalHours),
      'Total Flights': drone.totalFlights,
      'Utilization Rate': `${drone.utilizationRate.toFixed(1)}%`,
      'Last Flight': this.formatDate(drone.lastFlightDate),
      'Battery Cycles': drone.batteryInfo?.cycles || 'N/A'
    }));

    this.downloadCSV(csvData, 'drone-statistics.csv');
  }

  static exportFlightsToCSV(flights: FlightLog[]): void {
    const csvData = flights.map(flight => ({
      'Flight ID': flight.flight_id,
      'Date': this.formatDate(flight.timestamp),
      'Pilot': flight.control_events?.drone?.[0]?.user_name || 'Unknown',
      'Drone': flight.drone_details.drone_name,
      'Site': flight.site_details.site_name,
      'Mission': flight.missions?.[0]?.mission_name || 'N/A',
      'Mission Type': flight.missions?.[0]?.type || 'N/A',
      'Duration': flight.missions?.[0] ? 
        this.formatHours((new Date(flight.missions[0].mission_end_time).getTime() - 
                         new Date(flight.missions[0].mission_start_time).getTime()) / (1000 * 60 * 60)) : 'N/A'
    }));

    this.downloadCSV(csvData, 'flight-logs.csv');
  }

  private static downloadCSV(data: any[], filename: string): void {
    const csv = this.convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private static convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if necessary
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }

  // Excel Export Functions
  static exportToExcel(data: {
    pilots?: PilotStats[];
    drones?: DroneStats[];
    flights?: FlightLog[];
    summary?: DashboardSummary;
  }, filename: string = 'flytbase-analytics.xlsx'): void {
    const workbook = XLSX.utils.book_new();

    if (data.pilots) {
      const pilotData = data.pilots.map(pilot => ({
        'Pilot ID': pilot.pilotId,
        'Pilot Name': pilot.pilotName,
        'Email': pilot.email,
        'Total Hours': pilot.totalHours,
        'Total Flights': pilot.totalFlights,
        'Missions': pilot.missions.join('; '),
        'Last Flight': pilot.lastFlightDate
      }));
      const pilotSheet = XLSX.utils.json_to_sheet(pilotData);
      XLSX.utils.book_append_sheet(workbook, pilotSheet, 'Pilots');
    }

    if (data.drones) {
      const droneData = data.drones.map(drone => ({
        'Drone ID': drone.droneId,
        'Drone Name': drone.droneName,
        'Model': drone.droneModel,
        'Total Hours': drone.totalHours,
        'Total Flights': drone.totalFlights,
        'Utilization Rate (%)': drone.utilizationRate,
        'Last Flight': drone.lastFlightDate,
        'Battery Cycles': drone.batteryInfo?.cycles || 'N/A'
      }));
      const droneSheet = XLSX.utils.json_to_sheet(droneData);
      XLSX.utils.book_append_sheet(workbook, droneSheet, 'Drones');
    }

    if (data.flights) {
      const flightData = data.flights.map(flight => ({
        'Flight ID': flight.flight_id,
        'Date': flight.timestamp,
        'Pilot': flight.control_events?.drone?.[0]?.user_name || 'Unknown',
        'Drone': flight.drone_details.drone_name,
        'Site': flight.site_details.site_name,
        'Mission': flight.missions?.[0]?.mission_name || 'N/A',
        'Mission Type': flight.missions?.[0]?.type || 'N/A'
      }));
      const flightSheet = XLSX.utils.json_to_sheet(flightData);
      XLSX.utils.book_append_sheet(workbook, flightSheet, 'Flights');
    }

    if (data.summary) {
      const summaryData = [
        { Metric: 'Total Flight Hours', Value: data.summary.totalFlightHours },
        { Metric: 'Total Flights', Value: data.summary.totalFlights },
        { Metric: 'Active Pilots', Value: data.summary.activePilots },
        { Metric: 'Active Drones', Value: data.summary.activeDrones },
        { Metric: 'Average Flight Duration (hours)', Value: data.summary.averageFlightDuration }
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    XLSX.writeFile(workbook, filename);
  }

  // PDF Export Functions
  static exportSummaryToPDF(summary: DashboardSummary, dateRange: { start: Date; end: Date }): void {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('FlytBase Flight Analytics Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Report Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`, 20, 35);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
    
    // Summary Statistics
    doc.setFontSize(16);
    doc.text('Summary Statistics', 20, 65);
    
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Flight Hours', this.formatHours(summary.totalFlightHours)],
      ['Total Flights', summary.totalFlights.toString()],
      ['Active Pilots', summary.activePilots.toString()],
      ['Active Drones', summary.activeDrones.toString()],
      ['Average Flight Duration', this.formatHours(summary.averageFlightDuration)]
    ];

    autoTable(doc, {
      startY: 75,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 20, right: 20 }
    });

    // Flight Type Classification
    if (summary.flightsByType.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      
      doc.setFontSize(16);
      doc.text('Flight Classification', 20, finalY);
      
      const flightTypeData = [
        ['Flight Type', 'Count', 'Hours'],
        ...summary.flightsByType.map(type => [
          type.type,
          type.count.toString(),
          this.formatHours(type.hours)
        ])
      ];

      autoTable(doc, {
        startY: finalY + 10,
        head: [flightTypeData[0]],
        body: flightTypeData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 20, right: 20 }
      });
    }

    doc.save('flytbase-summary-report.pdf');
  }

  static exportPilotReportToPDF(pilots: PilotStats[], dateRange: { start: Date; end: Date }): void {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Pilot Performance Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Report Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`, 20, 35);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
    
    // Pilot Data
    const pilotData = [
      ['Pilot Name', 'Total Hours', 'Total Flights', 'Last Flight'],
      ...pilots.map(pilot => [
        pilot.pilotName,
        this.formatHours(pilot.totalHours),
        pilot.totalFlights.toString(),
        new Date(pilot.lastFlightDate).toLocaleDateString()
      ])
    ];

    autoTable(doc, {
      startY: 65,
      head: [pilotData[0]],
      body: pilotData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10 }
    });

    doc.save('pilot-performance-report.pdf');
  }

  static exportDroneReportToPDF(drones: DroneStats[], dateRange: { start: Date; end: Date }): void {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Drone Utilization Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Report Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`, 20, 35);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
    
    // Drone Data
    const droneData = [
      ['Drone Name', 'Model', 'Total Hours', 'Total Flights', 'Utilization %'],
      ...drones.map(drone => [
        drone.droneName,
        drone.droneModel,
        this.formatHours(drone.totalHours),
        drone.totalFlights.toString(),
        `${drone.utilizationRate.toFixed(1)}%`
      ])
    ];

    autoTable(doc, {
      startY: 65,
      head: [droneData[0]],
      body: droneData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10 }
    });

    doc.save('drone-utilization-report.pdf');
  }

  // Regulatory Compliance Reports
  static exportRegulatoryReport(data: {
    summary: DashboardSummary;
    pilots: PilotStats[];
    drones: DroneStats[];
    dateRange: { start: Date; end: Date };
    reportType: 'monthly' | 'annual';
    authority: string;
  }): void {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text(`${data.reportType.charAt(0).toUpperCase() + data.reportType.slice(1)} Regulatory Compliance Report`, 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Submitted to: ${data.authority}`, 20, 35);
    doc.text(`Report Period: ${data.dateRange.start.toLocaleDateString()} - ${data.dateRange.end.toLocaleDateString()}`, 20, 45);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 55);
    
    // Executive Summary
    doc.setFontSize(16);
    doc.text('Executive Summary', 20, 75);
    
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Flight Hours', this.formatHours(data.summary.totalFlightHours)],
      ['Total Number of Flights', data.summary.totalFlights.toString()],
      ['Number of Active Pilots', data.summary.activePilots.toString()],
      ['Number of Active Drones', data.summary.activeDrones.toString()],
      ['VLOS Flight Hours', this.formatHours(data.summary.flightsByType.find(t => t.type === 'VLOS')?.hours || 0)],
      ['BVLOS Flight Hours', this.formatHours(data.summary.flightsByType.find(t => t.type === 'BVLOS')?.hours || 0)]
    ];

    autoTable(doc, {
      startY: 85,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 20, right: 20 }
    });

    const filename = `regulatory-${data.reportType}-report-${data.dateRange.start.getFullYear()}-${String(data.dateRange.start.getMonth() + 1).padStart(2, '0')}.pdf`;
    doc.save(filename);
  }
}