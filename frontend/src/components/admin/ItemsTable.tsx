import {
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material'
import type { Item, ItemFilters, PaginationMeta } from '../../types/item'
import { PAGE_SIZE_OPTIONS, categoryLabel } from '../../constants/items'
import { formatDate, formatDateTime } from '../../utils/format'
import SortableHeaderCell from '../items/SortableHeaderCell'
import StatusChip from '../items/StatusChip'
import TypeChip from '../items/TypeChip'
import ItemRowActions from './ItemRowActions'

interface ItemsTableProps {
  items: Item[]
  meta: PaginationMeta
  filters: ItemFilters
  loading?: boolean
  busy?: boolean
  onSort: (change: Pick<ItemFilters, 'sort' | 'order'>) => void
  onView: (item: Item) => void
  onEdit: (item: Item) => void
  onPageChange: (page: number) => void
  onRowsPerPageChange: (limit: number) => void
  onToggleStatus: (item: Item) => void
  onDelete: (item: Item) => void
}

export default function ItemsTable({
  items,
  meta,
  filters,
  loading,
  busy,
  onSort,
  onView,
  onEdit,
  onPageChange,
  onRowsPerPageChange,
  onToggleStatus,
  onDelete,
}: ItemsTableProps) {
  const sortProps = { filters, onSort }
  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small" sx={{ minWidth: 900, opacity: loading ? 0.5 : 1 }}>
          <TableHead>
            <TableRow>
              <SortableHeaderCell field="title" label="Title" {...sortProps} />
              <SortableHeaderCell field="type" label="Type" {...sortProps} />
              <SortableHeaderCell field="category" label="Category" {...sortProps} />
              <SortableHeaderCell field="location" label="Location" {...sortProps} />
              <SortableHeaderCell field="occurred_at" label="Lost / found on" {...sortProps} />
              <SortableHeaderCell field="status" label="Status" {...sortProps} />
              <SortableHeaderCell field="created_at" label="Reported" {...sortProps} />
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ maxWidth: 220 }}>
                  <Link
                    component="button"
                    type="button"
                    onClick={() => onView(item)}
                    underline="hover"
                    noWrap
                    sx={{ display: 'block', maxWidth: '100%', textAlign: 'left' }}
                  >
                    {item.title}
                  </Link>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {item.contact_name} · {item.contact_info}
                  </Typography>
                </TableCell>
                <TableCell>
                  <TypeChip type={item.type} />
                </TableCell>
                <TableCell>{categoryLabel(item.category)}</TableCell>
                <TableCell sx={{ maxWidth: 180 }}>
                  <Typography variant="body2" noWrap>
                    {item.location}
                  </Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(item.occurred_at)}</TableCell>
                <TableCell>
                  <StatusChip status={item.status} />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(item.created_at)}</TableCell>
                <TableCell align="right">
                  <ItemRowActions
                    item={item}
                    disabled={busy}
                    onView={onView}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                    onDelete={onDelete}
                  />
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No items match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={meta.total}
        page={meta.page - 1}
        rowsPerPage={meta.limit}
        rowsPerPageOptions={PAGE_SIZE_OPTIONS}
        onPageChange={(_, page) => onPageChange(page + 1)}
        onRowsPerPageChange={(e) => onRowsPerPageChange(Number(e.target.value))}
      />
    </Paper>
  )
}
