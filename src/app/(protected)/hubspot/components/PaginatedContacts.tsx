import { useEffect, useState } from 'react'
import { DataTable } from '@/components/ui/data-table'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  company: string
  createDate: string
  companyId?: string
}

export function PaginatedContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 100

  const fetchContacts = async (page: number) => {
    try {
      setIsLoading(true)
      const after = page > 1 ? contacts[(page - 1) * itemsPerPage - 1]?.id : undefined
      const response = await fetch(`/api/hubspot/contacts?limit=${itemsPerPage}${after ? `&after=${after}` : ''}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts')
      }

      const data = await response.json()
      setContacts(data.contacts)
      setTotalItems(data.pagination.total)
      setTotalPages(Math.ceil(data.pagination.total / itemsPerPage))
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts(currentPage)
  }, [currentPage])

  const columns = [
    {
      header: 'Name',
      accessorKey: (contact: Contact) => `${contact.firstName} ${contact.lastName}`,
    },
    {
      header: 'Email',
      accessorKey: 'email' as keyof Contact,
    },
    {
      header: 'Phone',
      accessorKey: 'phone' as keyof Contact,
    },
    {
      header: 'Job Title',
      accessorKey: 'jobTitle' as keyof Contact,
    },
    {
      header: 'Company',
      accessorKey: 'company' as keyof Contact,
    },
    {
      header: 'Created',
      accessorKey: 'createDate' as keyof Contact,
      format: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={contacts}
      isLoading={isLoading}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      onPageChange={setCurrentPage}
    />
  )
} 