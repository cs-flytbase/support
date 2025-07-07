import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'

interface Owner {
  hubspot_owner_id: string
  email: string
  first_name: string
  last_name: string
  job_title: string
  team_id: string
  hubspot_synced_at: string
}

export function DealOwners() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOwners() {
      try {
        setLoading(true)
        const response = await fetch('/api/hubspot/owners')
        if (!response.ok) {
          throw new Error('Failed to fetch owners')
        }
        const data = await response.json()
        setOwners(data.owners || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch owners')
        console.error('Error fetching owners:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOwners()
  }, [])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-500">Error: {error}</div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Deal Owners</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Team ID</TableHead>
            <TableHead>Last Synced</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {owners.map((owner) => (
            <TableRow key={owner.hubspot_owner_id}>
              <TableCell>
                {owner.first_name} {owner.last_name}
              </TableCell>
              <TableCell>{owner.email}</TableCell>
              <TableCell>{owner.job_title}</TableCell>
              <TableCell>{owner.team_id}</TableCell>
              <TableCell>
                {new Date(owner.hubspot_synced_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
          {owners.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No owners found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  )
} 