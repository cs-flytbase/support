"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// Types
interface PartnerCustomer {
  id: string;
  name: string;
  email?: string;
  country?: string;
  region?: string;
  closed_won?: number;
  contracted?: number;
  totalPipelineAmount?: number;
  weighted_pipeline?: number;
  deal_count?: number;
  fc_plus?: number;
  fc_minus?: number;
}

interface FlytCreateData {
  totalFcConsumed: number;
  totalFcCommitted: number;
  totalFcPipelined: number;
}

const formatCurrency = (amount?: number | null) => {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num?: number | null) => {
  if (!num) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<PartnerCustomer[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<PartnerCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [flytCreateData, setFlytCreateData] = useState<FlytCreateData>({
    totalFcConsumed: 0,
    totalFcCommitted: 0,
    totalFcPipelined: 0
  });
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    filterPartners();
  }, [partners, regionFilter, typeFilter]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      
      // Fetch partner customers with their deal data
      const { data: partnersData, error: partnersError } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          email,
          country,
          region,
          closed_won,
          Contracted,
          totalPipelineAmount,
          Weighted_Pipeline
        `)
        .eq('customer_type', 'partner')
        .order('name');

      if (partnersError) {
        console.error('Error fetching partners:', partnersError);
        return;
      }

      // Fetch deals data for partners to calculate FC+ and FC-
      const partnerIds = partnersData?.map(p => p.id) || [];
      
      if (partnerIds.length === 0) {
        setPartners([]);
        setFlytCreateData({ totalFcConsumed: 0, totalFcCommitted: 0, totalFcPipelined: 0 });
        return;
      }
      
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          customer_id,
          amount,
          status,
          deal_stage
        `)
        .in('customer_id', partnerIds);

      if (dealsError) {
        console.error('Error fetching deals:', dealsError);
      }

      // Process partners data with deal calculations
      const processedPartners: PartnerCustomer[] = partnersData.map(partner => {
        const partnerDeals = dealsData?.filter(deal => deal.customer_id === partner.id) || [];
        
        // Calculate FC+ (positive deals, won deals)
        const fcPlus = partnerDeals
          .filter(deal => 
            deal.status === 'closedwon' || 
            deal.deal_stage === 'closedwon' ||
            (deal.amount && deal.amount > 0)
          )
          .reduce((sum, deal) => sum + (Number(deal.amount) || 0), 0);

        // Calculate FC- (lost deals, negative pipeline)
        const fcMinus = partnerDeals
          .filter(deal => 
            deal.status === 'closedlost' || 
            deal.deal_stage === 'closedlost'
          )
          .reduce((sum, deal) => sum + (Number(deal.amount) || 0), 0);

        return {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          country: partner.country,
          region: partner.region,
          deal_count: partnerDeals.length,
          fc_plus: fcPlus,
          fc_minus: fcMinus,
          totalPipelineAmount: Number(partner.totalPipelineAmount) || 0,
          weighted_pipeline: Number(partner.Weighted_Pipeline) || 0,
          closed_won: Number(partner.closed_won) || 0,
          contracted: Number(partner.Contracted) || 0
        };
      });

      setPartners(processedPartners);

      // Calculate aggregate FlytCreate data
      const totalFcConsumed = processedPartners.reduce((sum, p) => sum + (p.closed_won || 0), 0);
      const totalFcCommitted = processedPartners.reduce((sum, p) => sum + (p.contracted || 0), 0);
      const totalFcPipelined = processedPartners.reduce((sum, p) => sum + (p.totalPipelineAmount || 0), 0);

      setFlytCreateData({
        totalFcConsumed,
        totalFcCommitted,
        totalFcPipelined
      });

    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPartners = () => {
    let filtered = [...partners];

    if (regionFilter !== 'all') {
      filtered = filtered.filter(partner => partner.region === regionFilter);
    }

    // Type filter could be based on deal_count or other criteria
    if (typeFilter === 'premium') {
      filtered = filtered.filter(partner => (partner.deal_count || 0) > 5);
    } else if (typeFilter === 'standard') {
      filtered = filtered.filter(partner => (partner.deal_count || 0) <= 5);
    }

    setFilteredPartners(filtered);
  };

  const handlePartnerClick = (partnerId: string) => {
    router.push(`/customers/${partnerId}`);
  };

  // Get top partners by consumption (closed won + contracted)
  const topPartnersByConsumption = [...partners]
    .sort((a, b) => ((b.closed_won || 0) + (b.contracted || 0)) - ((a.closed_won || 0) + (a.contracted || 0)))
    .slice(0, 4);

  // Get top partners by pipeline
  const topPartnersByPipeline = [...partners]
    .sort((a, b) => (b.totalPipelineAmount || 0) - (a.totalPipelineAmount || 0))
    .slice(0, 4);

  // Get unique regions for filter
  const regions = Array.from(new Set(partners.map(p => p.region).filter(Boolean))) as string[];

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Partner Dashboard</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading partners data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Partner Dashboard</h1>
        <p className="text-gray-600 mt-2">Total Partners: {partners.length}</p>
      </div>

      {/* Top Row - FlytCreate Data and Top Partners by PC Consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FlytCreate Data */}
        <Card className="border border-gray-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Global FlytCredit Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-600">Total FC Consumed</div>
                <div className="text-lg font-bold">{formatCurrency(flytCreateData.totalFcConsumed)}</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-600">Total FC Committed</div>
                <div className="text-lg font-bold">{formatCurrency(flytCreateData.totalFcCommitted)}</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-600">Total FC Pipelined</div>
                <div className="text-lg font-bold">{formatCurrency(flytCreateData.totalFcPipelined)}</div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium text-gray-600 mb-2">Current Month</div>
                  <div className="space-y-1 text-sm">
                    <div>FC +: <span className="font-semibold">{formatCurrency(partners.reduce((sum, p) => sum + (p.fc_plus || 0), 0))}</span></div>
                    <div>FC -: <span className="font-semibold">{formatCurrency(partners.reduce((sum, p) => sum + (p.fc_minus || 0), 0))}</span></div>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-600 mb-2">This Quarter</div>
                  <div className="space-y-1 text-sm">
                    <div>Active Deals: <span className="font-semibold">{partners.reduce((sum, p) => sum + (p.deal_count || 0), 0)}</span></div>
                    <div>Total Pipeline: <span className="font-semibold">{formatCurrency(flytCreateData.totalFcPipelined)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Partners by PC Consumption */}
        <Card className="border border-gray-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Top Partners (by Revenue)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 border-b pb-2">
                <div>NAME</div>
                <div>COUNTRY</div>
                <div>Closed Won</div>
                <div>Contracted</div>
              </div>
              {topPartnersByConsumption.map((partner, index) => (
                <div 
                  key={index} 
                  className="grid grid-cols-4 gap-2 text-sm py-1 cursor-pointer hover:bg-gray-50 rounded px-2"
                  onClick={() => handlePartnerClick(partner.id)}
                >
                  <div className="font-medium text-blue-600 hover:text-blue-800">{partner.name}</div>
                  <div>{partner.country || 'N/A'}</div>
                  <div>{formatCurrency(partner.closed_won)}</div>
                  <div>{formatCurrency(partner.contracted)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Top Partners by Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary Stats */}
        <Card className="border border-gray-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">2025 Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-600">Closed Won</div>
                <div className="text-lg font-bold">{formatCurrency(partners.reduce((sum, p) => sum + (p.closed_won || 0), 0))}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Active Partners</div>
                <div className="text-lg font-bold">{partners.filter(p => (p.deal_count || 0) > 0).length}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Total Pipeline</div>
                <div className="text-lg font-bold">{formatCurrency(flytCreateData.totalFcPipelined)}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Weighted Pipeline</div>
                <div className="text-lg font-bold">{formatCurrency(partners.reduce((sum, p) => sum + (p.weighted_pipeline || 0), 0))}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Partners by Pipeline */}
        <Card className="border border-gray-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Top Partners (by Pipeline)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 border-b pb-2">
                <div>NAME</div>
                <div>REGION</div>
                <div>Total Pipeline</div>
                <div>Weighted</div>
              </div>
              {topPartnersByPipeline.map((partner, index) => (
                <div 
                  key={index} 
                  className="grid grid-cols-4 gap-2 text-sm py-1 cursor-pointer hover:bg-gray-50 rounded px-2"
                  onClick={() => handlePartnerClick(partner.id)}
                >
                  <div className="font-medium text-blue-600 hover:text-blue-800">{partner.name}</div>
                  <div>{partner.region || 'N/A'}</div>
                  <div>{formatCurrency(partner.totalPipelineAmount)}</div>
                  <div>{formatCurrency(partner.weighted_pipeline)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partners Table */}
      <Card className="border border-gray-300">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">All Partners ({filteredPartners.length})</CardTitle>
          <div className="flex gap-2">
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="premium">Premium (5+ deals)</SelectItem>
                <SelectItem value="standard">Standard (≤5 deals)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Name</TableHead>
                <TableHead className="text-right">FC +</TableHead>
                <TableHead className="text-right">FC -</TableHead>
                <TableHead className="text-right">Total Pipeline</TableHead>
                <TableHead className="text-right">Weighted Pipeline</TableHead>
                <TableHead className="text-right"># of Deals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.map((partner) => (
                <TableRow 
                  key={partner.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handlePartnerClick(partner.id)}
                >
                  <TableCell className="font-medium">
                    <div className="text-blue-600 hover:text-blue-800">{partner.name}</div>
                    {partner.region && <div className="text-xs text-gray-500">{partner.region}</div>}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(partner.fc_plus)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(partner.fc_minus)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(partner.totalPipelineAmount)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(partner.weighted_pipeline)}</TableCell>
                  <TableCell className="text-right">{partner.deal_count || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredPartners.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No partners found matching the selected filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
