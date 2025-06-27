"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Sample data matching the mockup
const flytCreateData = {
  totalFcConsumed: 1000000,
  totalFcCommitted: 100000,
  totalFcPipelined: 100000
};

const quarterlyData = {
  june: { fcPlus: 5000, fcMinus: 50000 },
  thisQ: { fcPlus: 50000, fcMinus: 500000 }
};

const yearData2025 = {
  closedWon: 320000,
  contractors: 25000,
  totalPipeline: 3100000,
  weightedPipeline: 1800000,
  q3: {
    totalPipeline: 360000,
    weightedPipeline: 220000
  }
};

const topPartnersByConsumption = [
  { name: 'Dronebase', country: 'Italy', totalFc: 500000, totalPc: 500000 },
  { name: 'UVT', country: 'USA', totalFc: 500000, totalPc: 500000 },
  { name: 'D&D Pros', country: 'USA', totalFc: 500000, totalPc: 500000 },
  { name: 'Drone Nerds', country: 'USA', totalFc: 500000, totalPc: 500000 }
];

const topPartnersByPipeline = [
  { name: 'Dronebase', country: 'Italy', totalPipe: 500000, weightedPipe: 500000 },
  { name: 'UVT', country: 'USA', totalPipe: 500000, weightedPipe: 500000 },
  { name: 'D&D Pros', country: 'USA', totalPipe: 500000, weightedPipe: 500000 },
  { name: 'Drone Nerds', country: 'USA', totalPipe: 500000, weightedPipe: 500000 }
];

const partnersTableData = [
  { name: 'Dronebase', fcPlus: 100000, fcMinus: 10000, totalPipeline: 100000, weightedPipeline: 10000, deals: 10 },
  { name: 'UVT', fcPlus: 200000, fcMinus: 15000, totalPipeline: 200000, weightedPipeline: 100000, deals: 15 },
  { name: 'D&D Pros', fcPlus: 50000, fcMinus: 5000, totalPipeline: 50000, weightedPipeline: 5000, deals: 8 },
  { name: 'Udwonic', fcPlus: 74450, fcMinus: 450, totalPipeline: 74450, weightedPipeline: 450, deals: 3 },
  { name: 'Sentera', fcPlus: 100000, fcMinus: 10000, totalPipeline: 100000, weightedPipeline: 10000, deals: 10 },
  { name: 'Aeronex', fcPlus: 200000, fcMinus: 100000, totalPipeline: 200000, weightedPipeline: 100000, deals: 15 },
  { name: 'Skydeln', fcPlus: 50000, fcMinus: 5000, totalPipeline: 50000, weightedPipeline: 5000, deals: 8 },
  { name: 'Droneland', fcPlus: 74450, fcMinus: 450, totalPipeline: 74450, weightedPipeline: 450, deals: 3 },
  { name: 'Dronetask', fcPlus: 74450, fcMinus: 450, totalPipeline: 100000, weightedPipeline: 10000, deals: 10 }
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

export default function PartnersPage() {
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Partner Dashboard</h1>
      </div>

      {/* Top Row - FlytCreate Data and Top Partners by PC Consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FlytCreate Data */}
        <Card className="border border-gray-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">FlytCreate Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-600">Total FC Consumed</div>
                <div className="text-lg font-bold">{formatNumber(flytCreateData.totalFcConsumed)}</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-600">Total FC Committed</div>
                <div className="text-lg font-bold">{formatNumber(flytCreateData.totalFcCommitted)}</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-600">Total FC Pipelined</div>
                <div className="text-lg font-bold">{formatNumber(flytCreateData.totalFcPipelined)}</div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium text-gray-600 mb-2">June</div>
                  <div className="space-y-1 text-sm">
                    <div>FC +: <span className="font-semibold">{formatNumber(quarterlyData.june.fcPlus)}</span></div>
                    <div>FC -: <span className="font-semibold">{formatNumber(quarterlyData.june.fcMinus)}</span></div>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-600 mb-2">This Q</div>
                  <div className="space-y-1 text-sm">
                    <div>FC +: <span className="font-semibold">{formatNumber(quarterlyData.thisQ.fcPlus)}</span></div>
                    <div>FC -: <span className="font-semibold">{formatNumber(quarterlyData.thisQ.fcMinus)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Partners by PC Consumption */}
        <Card className="border border-gray-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Top Partners (by PC consumption)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 border-b pb-2">
                <div>NAME</div>
                <div>COUNTRY</div>
                <div>Total FC</div>
                <div>Total PC</div>
              </div>
              {topPartnersByConsumption.map((partner, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 text-sm py-1">
                  <div className="font-medium">{partner.name}</div>
                  <div>{partner.country}</div>
                  <div>{formatNumber(partner.totalFc)}</div>
                  <div>{formatNumber(partner.totalPc)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - 2025 Stats and Top Partners by Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2025 Stats */}
        <Card className="border border-gray-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">2025</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-600">Closed Won</div>
                <div className="text-lg font-bold">{formatCurrency(yearData2025.closedWon)}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Contractors</div>
                <div className="text-lg font-bold">{formatNumber(yearData2025.contractors)}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Total Pipeline</div>
                <div className="text-lg font-bold">{formatCurrency(yearData2025.totalPipeline)}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Weighted Pipeline</div>
                <div className="text-lg font-bold">{formatCurrency(yearData2025.weightedPipeline)}</div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="font-medium text-gray-600 mb-2">Q3 2025</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Total Pipeline</div>
                  <div className="font-semibold">{formatCurrency(yearData2025.q3.totalPipeline)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Weighted Pipeline</div>
                  <div className="font-semibold">{formatCurrency(yearData2025.q3.weightedPipeline)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Partners by Pipeline */}
        <Card className="border border-gray-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Top Partners (by pipeline)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 border-b pb-2">
                <div>NAME</div>
                <div>COUNTRY</div>
                <div>Total Pipe</div>
                <div>Weighted Pipe</div>
              </div>
              {topPartnersByPipeline.map((partner, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 text-sm py-1">
                  <div className="font-medium">{partner.name}</div>
                  <div>{partner.country}</div>
                  <div>{formatNumber(partner.totalPipe)}</div>
                  <div>{formatNumber(partner.weightedPipe)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partners Table */}
      <Card className="border border-gray-300">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Partners</CardTitle>
          <div className="flex gap-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="usa">USA</SelectItem>
                <SelectItem value="italy">Italy</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
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
              {partnersTableData.map((partner, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(partner.fcPlus)}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(partner.fcMinus)}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(partner.totalPipeline)}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(partner.weightedPipeline)}</TableCell>
                  <TableCell className="text-right">{partner.deals}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
