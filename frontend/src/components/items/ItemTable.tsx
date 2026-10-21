import {
  Avatar,
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
import { useNavigate } from 'react-router-dom'
import { MdImage } from 'react-icons/md'
import { resolveAssetUrl } from '../../api/client'
import type { Item, ItemFilters, PaginationMeta } from '../../types/item'
import { PAGE_SIZE_OPTIONS, categoryLabel } from '../../constants/items'
import { formatDate, formatDateTime } from '../../utils/format'
import SortableHeaderCell from './SortableHeaderCell'
import StatusChip from './StatusChip'
import TypeChip from './TypeChip'

interface ItemTableProps {
  items: Item[]
  meta: PaginationMeta
  filters: ItemFilters
  loading?: boolean
  onSort: (change: Pick<ItemFilters, 'sort' | 'order'>) => void
  onPageChange: (page: number) => void
  onRowsPerPageChange: (limit: number) => void
}

/** Read-only, sortable table of items for the public list; each row opens the item. */
export default function ItemTable({
  items,
  meta,
  filters,
  loading,
  onSort,
  onPageChange,
  onRowsPerPageChange,
}: ItemTableProps) {
  const navigate = useNavigate()
  const sortProps = { filters, onSort }
  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small" sx={{ minWidth: 860, opacity: loading ? 0.5 : 1 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 56 }} />
              <SortableHeaderCell field="title" label="Title" {...sortProps} />
              <SortableHeaderCell field="type" label="Type" {...sortProps} />
              <SortableHeaderCell field="category" label="Category" {...sortProps} />
              <SortableHeaderCell field="location" label="Location" {...sortProps} />
              <SortableHeaderCell field="occurred_at" label="Lost / found on" {...sortProps} />
              <SortableHeaderCell field="status" label="Status" {...sortProps} />
              <SortableHeaderCell field="created_at" label="Reported" {...sortProps} />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const open = () => navigate(`/items/${item.id}`)
              return (
                <TableRow
                  key={item.id}
                  hover
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') open()
                  }}
                  sx={{ cursor: 'pointer', opacity: item.status === 'resolved' ? 0.75 : 1 }}
                >
                  <TableCell>
                    <Avatar
                      variant="rounded"
                      src={item.image_url ? resolveAssetUrl(item.image_url) : undefined}
                      alt={item.title}
                      sx={{ bgcolor: 'grey.100', color: 'grey.400' }}
                    >
                      <MdImage />
                    </Avatar>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {item.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TypeChip type={item.type} />
                  </TableCell>
                  <TableCell>{categoryLabel(item.category)}</TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>
                      {item.location}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(item.occurred_at)}</TableCell>
                  <TableCell>
                    <StatusChip status={item.status} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(item.created_at)}</TableCell>
                </TableRow>
              )
            })}
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
