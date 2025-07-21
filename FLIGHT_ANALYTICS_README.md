# FlytBase Flight Analytics Dashboard

A comprehensive flight analytics and regulatory reporting dashboard built for FlytBase customers including Asheville Police Department, Statnett Norway, and Quellaveco Mining Operation.

## Features

### 🎯 Customer-Specific Requirements

#### Asheville Police Department (FAA/Police Reporting)
- ✅ Summarized flight statistics (hours flown and flight counts)
- ✅ Pilot-specific reporting with mission details
- ✅ CSV/Excel data export capabilities
- ✅ FAA and Police Department regulatory compliance reports
- ✅ Integration-ready architecture for DroneSense

#### Statnett (Norwegian Power Grid Company)
- ✅ Annual regulatory reporting frequency
- ✅ VLOS (Visual Line of Sight) vs BVLOS (Beyond Visual Line of Sight) flight classification
- ✅ Active pilots and drones tracking
- ✅ Pilot flight hours monitoring
- ✅ Mission classification and geographic mapping data
- ✅ Equipment/maintenance logging with battery cycle tracking
- ✅ Multiple export formats (CSV, Excel, PDF)

#### Quellaveco Mining Operation (via UAV Latam)
- ✅ Automated monthly flight reports
- ✅ DGAC (local CAA) regulatory compliance
- ✅ Flight hours breakdown by drone/dock
- ✅ Flight hours breakdown by user/pilot
- ✅ Automated PDF report generation

### 📊 Dashboard Views

1. **Executive Overview**
   - Total flight hours and flight counts
   - Active pilot and drone statistics
   - Monthly trend analysis
   - Mission type distribution
   - VLOS/BVLOS classification

2. **Pilot Analytics**
   - Individual pilot performance metrics
   - Flight hours and mission counts per pilot
   - Mission history and types
   - Search and filtering capabilities
   - Export functionality

3. **Drone/Fleet Analytics**
   - Drone utilization rates
   - Fleet performance metrics
   - Battery cycle monitoring
   - Maintenance indicators
   - Utilization efficiency tracking

4. **Flight Logs**
   - Detailed flight records table
   - Advanced filtering by site, mission type, pilot, drone
   - Sortable columns (date, duration, pilot, drone)
   - Pagination for large datasets
   - Mission details and waypoint information

5. **Regulatory Compliance**
   - Customer-specific report generation
   - Automated monthly/annual reports
   - Regulatory authority templates
   - VLOS/BVLOS hour tracking
   - Pilot certification monitoring

### 🔧 Technical Features

- **Real-time Data Processing**: Efficient API consumption and data aggregation
- **Export Capabilities**: CSV, Excel, and PDF generation with professional formatting
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Search & Filter**: Advanced filtering across all data dimensions
- **Date Range Selection**: Flexible time period filtering
- **Data Visualization**: Interactive charts using Recharts
- **Performance Optimized**: Paginated data loading and efficient caching

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- FlytBase API credentials (optional for demo)

### Quick Start

1. **Clone and Install**
```bash
git clone <repository-url>
cd <project-directory>
npm install
```

2. **Environment Configuration**
```bash
cp .env.local.example .env.local
# Edit .env.local with your FlytBase API credentials
```

3. **Run Development Server**
```bash
npm run dev
```

4. **Access Dashboard**
Navigate to `http://localhost:3000/dashboard/flight-analytics`

### Environment Variables

```env
# FlytBase API Configuration
NEXT_PUBLIC_FLYTBASE_TOKEN=your_api_token
NEXT_PUBLIC_FLYTBASE_ORG_ID=your_organization_id
```

**Note**: The dashboard includes comprehensive mock data for demonstration purposes. Real API credentials are only needed for production use.

## API Integration

### FlytBase API Endpoints

The dashboard integrates with the following FlytBase API endpoints:

- `GET /v2/flight` - Flight logs retrieval
- `GET /v2/flight/filters` - Available filter options
- `GET /v2/flight/{flight_id}` - Detailed flight information

### Authentication

```javascript
const headers = {
  'Authorization': `Bearer ${token}`,
  'org-id': organizationId,
  'st-auth-mode': 'header',
  'rid': 'anti-csrf',
  'Accept': 'application/json, text/plain, */*'
};
```

### Data Processing

The dashboard performs sophisticated data processing including:

- **Flight Duration Calculation**: Precise mission timing analysis
- **Pilot Statistics Aggregation**: Performance metrics across multiple flights
- **Drone Utilization Rates**: Fleet efficiency calculations
- **VLOS/BVLOS Classification**: Automated flight type categorization
- **Monthly Trend Analysis**: Time-series data aggregation

## Usage Guide

### Navigation

Access the Flight Analytics Dashboard through the sidebar navigation:
- **Overview**: Executive summary and trend charts
- **Pilot Analytics**: Individual pilot performance
- **Drone Analytics**: Fleet utilization metrics
- **Flight Logs**: Detailed flight records
- **Compliance**: Regulatory reporting tools

### Filtering Data

1. **Time Range Selection**
   - Last 7 days, 30 days, 3 months, 12 months
   - Year to date
   - Custom date range picker

2. **Search & Filter**
   - Text search across pilots, drones, sites, missions
   - Filter by site location
   - Filter by mission type
   - Sort by various criteria

### Exporting Data

1. **Quick Exports**
   - CSV: Raw data for spreadsheet analysis
   - Excel: Multi-sheet workbooks with formatting
   - PDF: Professional reports for regulatory submission

2. **Regulatory Reports**
   - Asheville PD: FAA and Police Department templates
   - Statnett: Annual Norwegian regulatory format
   - Quellaveco: Monthly DGAC compliance reports

### Compliance Features

#### For Asheville Police Department
- Generate pilot-specific flight statistics
- Export mission summaries with timestamps
- FAA-compliant reporting format
- Police department operational summaries

#### For Statnett Norway
- Annual VLOS/BVLOS hour reporting
- Pilot certification tracking
- Equipment utilization reports
- Geographic operation summaries

#### For Quellaveco Mining
- Automated monthly report generation
- Drone-specific hour breakdowns
- Pilot performance summaries
- DGAC regulatory format

## Architecture

### Frontend Stack
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Data visualization library
- **Radix UI**: Accessible component primitives

### Key Components

```
src/
├── app/dashboard/flight-analytics/
│   └── page.tsx                    # Main dashboard page
├── components/flight-analytics/
│   ├── FlightSummaryCards.tsx     # Executive overview cards
│   ├── FlightTrendsChart.tsx      # Monthly trend visualization
│   ├── FlightTypeChart.tsx        # VLOS/BVLOS classification
│   ├── PilotAnalytics.tsx         # Pilot performance component
│   ├── DroneAnalytics.tsx         # Fleet utilization component
│   ├── FlightLogsTable.tsx        # Detailed flight records
│   ├── DateRangeFilter.tsx        # Time period selection
│   └── ExportPanel.tsx            # Data export functionality
├── lib/
│   ├── services/flytbase-api.ts   # FlytBase API integration
│   └── export.ts                  # Export utilities
└── types/flytbase.ts              # TypeScript definitions
```

### Data Flow

1. **API Service Layer**: Handles FlytBase API communication
2. **Data Processing**: Aggregates and calculates analytics
3. **State Management**: React hooks for component state
4. **UI Components**: Reusable, accessible interface elements
5. **Export Layer**: Multi-format data export capabilities

## Performance Considerations

- **Pagination**: Large datasets handled with efficient pagination
- **Caching**: Intelligent data caching for repeated requests
- **Lazy Loading**: Components loaded as needed
- **Optimized Queries**: Minimal API calls with maximum data retrieval
- **Progressive Enhancement**: Core functionality works without JavaScript

## Security & Compliance

- **Token-based Authentication**: Secure API communication
- **Organization Isolation**: Data scoped to specific organizations
- **CORS Compliance**: Proper cross-origin request handling
- **Data Privacy**: No sensitive data stored in browser localStorage
- **Audit Trail**: Comprehensive logging for regulatory compliance

## Customization

### Adding New Customer Requirements

1. **Create Customer Profile**
```typescript
interface CustomerConfig {
  name: string;
  reportingFrequency: 'monthly' | 'annual';
  requiredMetrics: string[];
  exportFormat: 'pdf' | 'excel' | 'csv';
  template: string;
}
```

2. **Extend Export Functions**
```typescript
DataExporter.exportCustomerReport(customer, data, dateRange);
```

3. **Add Compliance Templates**
Create new PDF templates in the export utilities for specific regulatory requirements.

### Custom Metrics

The dashboard architecture supports easy addition of new metrics:

```typescript
// Add to DashboardSummary interface
interface DashboardSummary {
  // ... existing metrics
  customMetric: number;
}

// Implement in FlytBaseAPI class
calculateCustomMetric(flights: FlightLog[]): number {
  // Custom calculation logic
}
```

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Verify token and organization ID
   - Check network connectivity
   - Ensure CORS settings allow requests

2. **Data Not Loading**
   - Check browser console for errors
   - Verify API endpoints are accessible
   - Ensure sufficient permissions

3. **Export Failures**
   - Check browser popup blockers
   - Verify sufficient data for export
   - Ensure browser supports file downloads

### Debug Mode

Enable debug mode by setting:
```javascript
localStorage.setItem('flytbase-debug', 'true');
```

## Support & Documentation

- **FlytBase API Documentation**: [api.flytbase.com/docs](https://api.flytbase.com/docs)
- **Component Library**: Built with Radix UI primitives
- **Chart Documentation**: Recharts library for data visualization
- **Export Utilities**: jsPDF and XLSX libraries for file generation

## Future Enhancements

### Planned Features (Phase 2)
- Real-time flight tracking
- Advanced filtering options
- Scheduled report automation
- Email delivery of reports
- DroneSense integration
- Airdata.com compatibility

### Planned Features (Phase 3)
- Predictive analytics
- Machine learning insights
- Advanced data visualizations
- Multi-organization support
- REST API for external integrations
- Mobile application

## License

This project is built for FlytBase customers and follows enterprise software licensing terms.

---

**Built with ❤️ for the drone industry** 

For support, contact: [Your Contact Information]