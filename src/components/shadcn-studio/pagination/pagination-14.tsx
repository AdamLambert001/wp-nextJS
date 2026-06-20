import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronFirstIcon, ChevronLeftIcon, ChevronRightIcon, ChevronLastIcon } from "lucide-react"

const pageItems = Array.from({ length: 10 }, (_, i) => ({
  label: `Page ${i + 1}`,
  value: String(i + 1)
}))

const PaginationWithSelectDemo = () => {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink href='#' aria-label='Go to first page' size='icon' className='rounded-full'>
            <ChevronFirstIcon className='size-4' />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#' aria-label='Go to previous page' size='icon' className='rounded-full'>
            <ChevronLeftIcon className='size-4' />
          </PaginationLink>
        </PaginationItem>

        <PaginationItem>
          <Select items={pageItems} defaultValue={String(1)} aria-label='Select page'>
            <SelectTrigger id='select-page' className='w-fit whitespace-nowrap' aria-label='Select page'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {pageItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </PaginationItem>

        <PaginationItem>
          <PaginationLink href='#' aria-label='Go to next page' size='icon' className='rounded-full'>
            <ChevronRightIcon className='size-4' />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#' aria-label='Go to last page' size='icon' className='rounded-full'>
            <ChevronLastIcon className='size-4' />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

export default PaginationWithSelectDemo
