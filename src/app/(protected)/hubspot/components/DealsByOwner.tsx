import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

interface Deal {
  id: string
  name: string
  stage: string
  value: number
  close_date: string
  company_name?: string
  company_domain?: string
  is_closed: boolean
  is_won: boolean
}

interface OwnerDeals {
  hubspot_owner_id: string | null
  owner_email: string
  total_deals: number
  total_value: number
  won_deals: number
  open_deals: number
  deals: Deal[]
}

interface DealsByOwnerResponse {
  dealsByOwner: OwnerDeals[]
  totalOwners: number
  totalDeals: number
  totalValue: number
}

export function DealsByOwner() {
  const [data, setData] = useState<DealsByOwnerResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchDealsByOwner()
  }, [])

  const fetchDealsByOwner = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/hubspot/deals-by-owner')
      if (!response.ok) {
        throw new Error('Failed to fetch deals by owner')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toggleOwnerExpanded = (ownerId: string | null) => {
    setExpandedOwners(prev => {
      const next = new Set(prev)
      const key = ownerId?.toString() || 'unassigned'
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  if (loading) return <div>Loading deals by owner...</div>
  if (error) return <div>Error: {error}</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Deals by Owner</CardTitle>
          <CardDescription>
            Overview of deals grouped by HubSpot owner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-muted p-3">
                <div className="text-sm font-medium">Total Owners</div>
                <div className="text-2xl font-bold">{data.totalOwners}</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <div className="text-sm font-medium">Total Deals</div>
                <div className="text-2xl font-bold">{data.totalDeals}</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <div className="text-sm font-medium">Total Value</div>
                <div className="text-2xl font-bold">{formatCurrency(data.totalValue)}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {data.dealsByOwner.map((ownerData) => {
              const isExpanded = expandedOwners.has(
                ownerData.hubspot_owner_id?.toString() || 'unassigned'
              )

              return (
                <Card key={ownerData.hubspot_owner_id || 'unassigned'} className="overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleOwnerExpanded(ownerData.hubspot_owner_id)}
                  >
                    <div>
                      <h3 className="font-semibold">{ownerData.owner_email}</h3>
                      <div className="text-sm text-muted-foreground">
                        {ownerData.total_deals} deals · {formatCurrency(ownerData.total_value)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        {ownerData.open_deals} Open
                      </Badge>
                      <Badge variant="success">
                        {ownerData.won_deals} Won
                      </Badge>
                    </div>
                  </div>

                  {isExpanded && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deal Name</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Close Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ownerData.deals.map((deal) => (
                          <TableRow key={deal.id}>
                            <TableCell>{deal.name}</TableCell>
                            <TableCell>
                              {deal.company_name}
                              {deal.company_domain && (
                                <div className="text-sm text-muted-foreground">
                                  {deal.company_domain}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{deal.stage}</TableCell>
                            <TableCell>{formatCurrency(deal.value)}</TableCell>
                            <TableCell>{new Date(deal.close_date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {deal.is_closed ? (
                                deal.is_won ? (
                                  <Badge variant="success">Won</Badge>
                                ) : (
                                  <Badge variant="destructive">Lost</Badge>
                                )
                              ) : (
                                <Badge>Open</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 