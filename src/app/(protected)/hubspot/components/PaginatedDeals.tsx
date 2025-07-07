import { useEffect, useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { formatCurrency } from '@/lib/utils'

interface Deal {
  id: string
  name: string
  stage: string
  value: number
  closeDate: string
  pipeline: string
  ownerId: string
  createDate: string
  companyId?: string
}

interface PaginatedDealsProps {
  ownerId?: string
}

export function PaginatedDeals({ ownerId }: PaginatedDealsProps) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 100

  const fetchDeals = async (page: number) => {
    try {
      setIsLoading(true)
      const after = page > 1 ? deals[(page - 1) * itemsPerPage - 1]?.id : undefined
      const response = await fetch(`/api/hubspot/deals?limit=${itemsPerPage}${after ? `&after=${after}` : ''}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch deals')
      }

      const data = await response.json()
      setDeals(data.deals)
      setTotalItems(data.pagination.total)
      setTotalPages(Math.ceil(data.pagination.total / itemsPerPage))
    } catch (error) {
      console.error('Error fetching deals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDeals(currentPage)
  }, [currentPage])

  const columns = [
    {
      header: 'Deal Name',
      accessorKey: 'name' as keyof Deal,
    },
    {
      header: 'Stage',
      accessorKey: 'stage' as keyof Deal,
    },
    {
      header: 'Value',
      accessorKey: 'value' as keyof Deal,
      format: (value: number) => formatCurrency(value),
      className: 'text-right',
    },
    {
      header: 'Close Date',
      accessorKey: 'closeDate' as keyof Deal,
      format: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      header: 'Pipeline',
      accessorKey: 'pipeline' as keyof Deal,
    },
    {
      header: 'Created',
      accessorKey: 'createDate' as keyof Deal,
      format: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={deals}
      isLoading={isLoading}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      onPageChange={setCurrentPage}
    />
  )
} 