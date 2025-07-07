'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Search, Building2, Users, HandCoins, MessageSquare, RefreshCw, Eye, Link } from 'lucide-react'
import { DealsByOwner } from './components/DealsByOwner'
import { SyncProgress } from '@/components/ui/sync-progress'
import { DealOwners } from './components/DealOwners'
import { PaginatedDeals } from './components/PaginatedDeals'
import { PaginatedContacts } from './components/PaginatedContacts'
import { PaginatedCompanies } from './components/PaginatedCompanies'

interface Company {
  id: string
  name: string
  domain?: string
  industry?: string
  city?: string
  state?: string
  contact_count?: number
  deal_count?: number
  total_deal_value?: number
  hubspot_company_id?: string
}

interface Contact {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  job_title?: string
  company_id?: string
  company_name?: string
  hubspot_contact_id?: string
  deal_count?: number
}

interface Deal {
  id: string
  deal_name: string
  deal_stage?: string
  deal_value?: number
  close_date?: string
  company_id?: string
  company_name?: string
  hubspot_deal_id?: string
  hubspot_owner_id?: string
  is_closed?: boolean
  is_closed_won?: boolean
}

interface HubSpotStats {
  companies: number
  contacts: number
  deals: number
  associations: number
}

export default function HubSpotPage() {
  const { userId } = useAuth()
  const [stats, setStats] = useState<HubSpotStats | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/hubspot/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Failed to fetch HubSpot stats')
    } finally {
      setLoading(false)
    }
  }

  const syncHubSpotData = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/hubspot/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncCompanies: true,
          syncContacts: true,
          syncDeals: true,
          contactsLimit: 1000,
          dealsLimit: 1000,
          batchMode: true
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to sync HubSpot data')
      }
      
      const result = await response.json()
      toast.success(`Synced ${result.stats.companies} companies, ${result.stats.contacts} contacts, and ${result.stats.deals} deals`)
      
      // After syncing data, link all associations
      await linkAllAssociations()
      
      // Refresh the stats
      await fetchStats()
    } catch (error) {
      console.error('Error syncing HubSpot data:', error)
      toast.error('Failed to sync HubSpot data')
    } finally {
      setSyncing(false)
    }
  }

  const linkAllAssociations = async () => {
    try {
      const response = await fetch('/api/hubspot/link-associations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to link associations')
      }
      
      const result = await response.json()
      toast.success('All associations linked successfully')
      await fetchStats()
    } catch (error) {
      console.error('Error linking associations:', error)
      toast.error('Failed to link associations')
    }
  }

  const checkDuplicates = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/hubspot/check-duplicates')
      
      if (!response.ok) {
        throw new Error('Failed to check duplicates')
      }
      
      const result = await response.json()
      if (result.duplicates.length > 0) {
        toast.warning(`Found ${result.duplicates.length} duplicate associations`)
      } else {
        toast.success('No duplicate associations found')
      }
    } catch (error) {
      console.error('Error checking duplicates:', error)
      toast.error('Failed to check duplicates')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">HubSpot Integration</h1>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={syncHubSpotData}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            {syncing && <RefreshCw className="h-4 w-4 animate-spin" />}
            Sync HubSpot Data
          </Button>
          
          <Button
            onClick={linkAllAssociations}
            disabled={syncing}
            
            className="flex items-center gap-2"
          >
            <Link className="h-4 w-4" />
            Link Associations
          </Button>
          
          <Button
            onClick={checkDuplicates}
            disabled={syncing}
            
          >
            Check Duplicates
          </Button>
        </div>
      </div>

      {stats && (
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Companies</h3>
              <p className="text-2xl font-bold">{stats.companies}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Contacts</h3>
              <p className="text-2xl font-bold">{stats.contacts}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Deals</h3>
              <p className="text-2xl font-bold">{stats.deals}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Associations</h3>
              <p className="text-2xl font-bold">{stats.associations}</p>
            </div>
          </div>
        </Card>
      )}
      
      <Tabs defaultValue="deals">
        <TabsList className="mb-4">
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="owners">Deal Owners</TabsTrigger>
        </TabsList>
        
        <TabsContent value="deals">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Deals</h2>
            <PaginatedDeals />
          </Card>
        </TabsContent>
        
        <TabsContent value="contacts">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Contacts</h2>
            <PaginatedContacts />
          </Card>
        </TabsContent>
        
        <TabsContent value="companies">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Companies</h2>
            <PaginatedCompanies />
          </Card>
        </TabsContent>

        <TabsContent value="owners">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Deal Owners</h2>
            <DealOwners />
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">Deals by Owner</h3>
              <DealsByOwner />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Company Details Component
function CompanyDetails({ 
  company, 
  contacts, 
  deals, 
  onSyncEngagements, 
  syncing 
}: {
  company: Company
  contacts: Contact[]
  deals: Deal[]
  onSyncEngagements: (dealId: string) => void
  syncing: boolean
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-2">Company Information</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Domain:</strong> {company.domain || 'N/A'}</div>
            <div><strong>Industry:</strong> {company.industry || 'N/A'}</div>
            <div><strong>Location:</strong> {company.city && company.state ? `${company.city}, ${company.state}` : 'N/A'}</div>
            <div><strong>HubSpot ID:</strong> {company.hubspot_company_id || 'N/A'}</div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Summary</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Total Contacts:</strong> {contacts.length}</div>
            <div><strong>Total Deals:</strong> {deals.length}</div>
            <div><strong>Total Deal Value:</strong> {company.total_deal_value ? formatCurrency(company.total_deal_value) : 'N/A'}</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="contacts" className="w-full">
        <TabsList>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="contacts">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>{`${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'N/A'}</TableCell>
                  <TableCell>{contact.email || 'N/A'}</TableCell>
                  <TableCell>{contact.job_title || 'N/A'}</TableCell>
                  <TableCell>{contact.phone || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        
        <TabsContent value="deals">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal Name</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Close Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell>{deal.deal_name}</TableCell>
                  <TableCell>{deal.deal_stage || 'N/A'}</TableCell>
                  <TableCell>{deal.deal_value ? formatCurrency(deal.deal_value) : 'N/A'}</TableCell>
                  <TableCell>{formatDate(deal.close_date)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onSyncEngagements(deal.id)}
                      disabled={syncing}
                    >
                      {syncing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Contact Details Component
function ContactDetails({ 
  contact, 
  deals, 
  onSyncEngagements, 
  syncing 
}: {
  contact: Contact
  deals: Deal[]
  onSyncEngagements: (dealId: string) => void
  syncing: boolean
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-2">Contact Information</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Email:</strong> {contact.email || 'N/A'}</div>
            <div><strong>Phone:</strong> {contact.phone || 'N/A'}</div>
            <div><strong>Job Title:</strong> {contact.job_title || 'N/A'}</div>
            <div><strong>Company:</strong> {contact.company_name || 'N/A'}</div>
            <div><strong>HubSpot ID:</strong> {contact.hubspot_contact_id || 'N/A'}</div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Summary</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Related Deals:</strong> {deals.length}</div>
            <div><strong>Total Deal Value:</strong> {formatCurrency(deals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0))}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Related Deals ({deals.length})</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deal Name</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Close Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell>{deal.deal_name}</TableCell>
                <TableCell>{deal.deal_stage || 'N/A'}</TableCell>
                <TableCell>{deal.deal_value ? formatCurrency(deal.deal_value) : 'N/A'}</TableCell>
                <TableCell>{formatDate(deal.close_date)}</TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onSyncEngagements(deal.id)}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// Deal Details Component
function DealDetails({ 
  deal, 
  onSyncEngagements, 
  syncing 
}: {
  deal: Deal
  onSyncEngagements: (dealId: string) => void
  syncing: boolean
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-2">Deal Information</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Stage:</strong> {deal.deal_stage || 'N/A'}</div>
            <div><strong>Value:</strong> {deal.deal_value ? formatCurrency(deal.deal_value) : 'N/A'}</div>
            <div><strong>Close Date:</strong> {formatDate(deal.close_date)}</div>
            <div><strong>Company:</strong> {deal.company_name || 'N/A'}</div>
            <div><strong>HubSpot ID:</strong> {deal.hubspot_deal_id || 'N/A'}</div>
            <div><strong>Owner ID:</strong> {deal.hubspot_owner_id || 'Unassigned'}</div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Status</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Status:</strong> 
              <Badge 
                variant={deal.is_closed_won ? 'default' : deal.is_closed ? 'destructive' : 'secondary'}
                className="ml-2"
              >
                {deal.is_closed_won ? 'Won' : deal.is_closed ? 'Lost' : 'Open'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={() => onSyncEngagements(deal.id)}
          disabled={syncing}
          className="w-full"
        >
          {syncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing Engagements...
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4 mr-2" />
              Sync Engagements
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 