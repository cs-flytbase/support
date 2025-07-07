import { useEffect, useState } from 'react'
import { DataTable } from '@/components/ui/data-table'

interface Company {
  id: string
  name: string
  domain: string
  industry: string
  type: string
  city: string
  state: string
  country: string
  createDate: string
}

export function PaginatedCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 100

  const fetchCompanies = async (page: number) => {
    try {
      setIsLoading(true)
      const after = page > 1 ? companies[(page - 1) * itemsPerPage - 1]?.id : undefined
      const response = await fetch(`/api/hubspot/companies?limit=${itemsPerPage}${after ? `&after=${after}` : ''}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch companies')
      }

      const data = await response.json()
      setCompanies(data.companies)
      setTotalItems(data.pagination.total)
      setTotalPages(Math.ceil(data.pagination.total / itemsPerPage))
    } catch (error) {
      console.error('Error fetching companies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies(currentPage)
  }, [currentPage])

  const columns = [
    {
      header: 'Company Name',
      accessorKey: 'name' as keyof Company,
    },
    {
      header: 'Domain',
      accessorKey: 'domain' as keyof Company,
    },
    {
      header: 'Industry',
      accessorKey: 'industry' as keyof Company,
    },
    {
      header: 'Type',
      accessorKey: 'type' as keyof Company,
    },
    {
      header: 'Location',
      accessorKey: (company: Company) => {
        const parts = [company.city, company.state, company.country].filter(Boolean)
        return parts.join(', ')
      },
    },
    {
      header: 'Created',
      accessorKey: 'createDate' as keyof Company,
      format: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={companies}
      isLoading={isLoading}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      onPageChange={setCurrentPage}
    />
  )
} 