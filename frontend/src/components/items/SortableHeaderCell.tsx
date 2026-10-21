import { TableCell, TableSortLabel } from '@mui/material'
import type { ItemFilters, SortField } from '../../types/item'
import { activeSort, sortChange } from '../../utils/itemQuery'

interface SortableHeaderCellProps {
  field: SortField
  label: string
  filters: ItemFilters
  onSort: (change: Pick<ItemFilters, 'sort' | 'order'>) => void
}

/** Column header that sorts the list by `field`; clicking the active column flips the direction. */
export default function SortableHeaderCell({ field, label, filters, onSort }: SortableHeaderCellProps) {
  const sort = activeSort(filters)
  const active = sort.field === field
  return (
    <TableCell sortDirection={active ? sort.order : false} sx={{ whiteSpace: 'nowrap' }}>
      <TableSortLabel
        active={active}
        direction={active ? sort.order : 'asc'}
        onClick={() => onSort(sortChange(filters, field))}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  )
}
