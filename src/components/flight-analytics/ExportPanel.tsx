import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Table, BarChart } from 'lucide-react';
import { FlightLog, PilotStats, DroneStats, DashboardSummary } from '@/types/flytbase';
import { DataExporter } from '@/lib/export';

interface ExportPanelProps {
  flightLogs: FlightLog[];
  pilotStats: PilotStats[];
  droneStats: DroneStats[];
  dashboardSummary: DashboardSummary | null;
  dateRange: { start: Date; end: Date };
}

export default function ExportPanel({
  flightLogs,
  pilotStats,
  droneStats,
  dashboardSummary,
  dateRange
}: ExportPanelProps) {
  const [selectedDataType, setSelectedDataType] = useState<'pilots' | 'drones' | 'flights' | 'summary'>('summary');
  const [isOpen, setIsOpen] = useState(false);

  const exportOptions = [
    {
      value: 'summary',
      label: 'Summary Report',
      icon: BarChart,
      description: 'Dashboard overview and statistics'
    },
    {
      value: 'pilots',
      label: 'Pilot Analytics',
      icon: FileText,
      description: 'Pilot performance and statistics'
    },
    {
      value: 'drones',
      label: 'Drone Analytics',
      icon: FileText,
      description: 'Fleet utilization and metrics'
    },
    {
      value: 'flights',
      label: 'Flight Logs',
      icon: Table,
      description: 'Detailed flight records'
    }
  ];

  const handleExportCSV = () => {
    switch (selectedDataType) {
      case 'pilots':
        DataExporter.exportPilotsToCSV(pilotStats);
        break;
      case 'drones':
        DataExporter.exportDronesToCSV(droneStats);
        break;
      case 'flights':
        DataExporter.exportFlightsToCSV(flightLogs);
        break;
      case 'summary':
        // Export all data as CSV (multiple files or combined)
        DataExporter.exportPilotsToCSV(pilotStats);
        setTimeout(() => DataExporter.exportDronesToCSV(droneStats), 500);
        setTimeout(() => DataExporter.exportFlightsToCSV(flightLogs), 1000);
        break;
    }
    setIsOpen(false);
  };

  const handleExportExcel = () => {
    const data: any = {};
    
    switch (selectedDataType) {
      case 'pilots':
        data.pilots = pilotStats;
        break;
      case 'drones':
        data.drones = droneStats;
        break;
      case 'flights':
        data.flights = flightLogs;
        break;
      case 'summary':
        data.pilots = pilotStats;
        data.drones = droneStats;
        data.flights = flightLogs;
        if (dashboardSummary) data.summary = dashboardSummary;
        break;
    }
    
    const filename = `flytbase-${selectedDataType}-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.xlsx`;
    DataExporter.exportToExcel(data, filename);
    setIsOpen(false);
  };

  const handleExportPDF = () => {
    if (!dashboardSummary) return;
    
    switch (selectedDataType) {
      case 'pilots':
        DataExporter.exportPilotReportToPDF(pilotStats, dateRange);
        break;
      case 'drones':
        DataExporter.exportDroneReportToPDF(droneStats, dateRange);
        break;
      case 'summary':
        DataExporter.exportSummaryToPDF(dashboardSummary, dateRange);
        break;
      case 'flights':
        // For flights, we'll export as summary since individual flight PDF would be too large
        DataExporter.exportSummaryToPDF(dashboardSummary, dateRange);
        break;
    }
    setIsOpen(false);
  };

  const handleRegulatoryReport = (authority: string, reportType: 'monthly' | 'annual') => {
    if (!dashboardSummary) return;
    
    DataExporter.exportRegulatoryReport({
      summary: dashboardSummary,
      pilots: pilotStats,
      drones: droneStats,
      dateRange,
      reportType,
      authority
    });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Export</span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Export Data</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Data Type Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Data Type</label>
              <Select value={selectedDataType} onValueChange={(value: any) => setSelectedDataType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exportOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-4 w-4" />
                          <div>
                            <div>{option.label}</div>
                            <div className="text-xs text-gray-500">{option.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Export Format Buttons */}
            <div className="space-y-2">
              <label className="text-sm font-medium block">Export Format</label>
              
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <Table className="h-4 w-4 mb-1" />
                  <span className="text-xs">CSV</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <BarChart className="h-4 w-4 mb-1" />
                  <span className="text-xs">Excel</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <FileText className="h-4 w-4 mb-1" />
                  <span className="text-xs">PDF</span>
                </Button>
              </div>
            </div>

            {/* Regulatory Reports */}
            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">Regulatory Reports</label>
              
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleRegulatoryReport('FAA/Police Department', 'monthly')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Asheville PD Report
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleRegulatoryReport('Statnett Norway', 'annual')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Statnett Annual Report
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleRegulatoryReport('DGAC Peru', 'monthly')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Quellaveco DGAC Report
                </Button>
              </div>
            </div>

            {/* Date Range Info */}
            <div className="text-xs text-gray-500 border-t pt-2">
              <p>Date Range: {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}</p>
              <p>Records: {flightLogs.length} flights, {pilotStats.length} pilots, {droneStats.length} drones</p>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}