import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'

interface Column<T> {
  header: string
  accessorKey: keyof T | ((item: T) => string | number)
  className?: string
  format?: (value: any) => string | number
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  currentPage: number
  totalPages: number
  totalItems?: number
  itemsPerPage?: number
  onPageChange: (page: number) => void
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange
}: DataTableProps<T>) {
  const getCellValue = (item: T, column: Column<T>) => {
    const value = typeof column.accessorKey === 'function'
      ? column.accessorKey(item)
      : item[column.accessorKey]
    
    if (column.format) {
      return column.format(value)
    }
    
    return String(value ?? '')
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={String(column.accessorKey)} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={String(column.accessorKey)} className={column.className}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination
          currentPage={1}
          totalPages={1}
          onPageChange={() => {}}
          showItemCount={false}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={String(column.accessorKey)} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={String(column.accessorKey)} className={column.className}>
                  {getCellValue(item, column)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
      />
    </div>
  )
} 