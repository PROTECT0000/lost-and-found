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
import { Link as RouterLink } from 'react-router-dom'
import type { Item, PaginationMeta } from '../../types/item'
import { categoryLabel } from '../../constants/items'
import { formatDate, formatDateTime } from '../../utils/format'
import StatusChip from '../items/StatusChip'
import TypeChip from '../items/TypeChip'
import ItemRowActions from './ItemRowActions'

const ROWS_PER_PAGE_OPTIONS = [12, 24, 48]

interface ItemsTableProps {
  items: Item[]
  meta: PaginationMeta
  loading?: boolean
  busy?: boolean
  onPageChange: (page: number) => void
  onRowsPerPageChange: (limit: number) => void
  onToggleStatus: (item: Item) => void
  onDelete: (item: Item) => void
}

export default function ItemsTable({
  items,
  meta,
  loading,
  busy,
  onPageChange,
  onRowsPerPageChange,
  onToggleStatus,
  onDelete,
}: ItemsTableProps) {
  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small" sx={{ minWidth: 900, opacity: loading ? 0.5 : 1 }}>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Lost / found on</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Reported</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ maxWidth: 220 }}>
                  <Link component={RouterLink} to={`/items/${item.id}`} underline="hover" noWrap sx={{ display: 'block' }}>
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
                  <ItemRowActions item={item} disabled={busy} onToggleStatus={onToggleStatus} onDelete={onDelete} />
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
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        onPageChange={(_, page) => onPageChange(page + 1)}
        onRowsPerPageChange={(e) => onRowsPerPageChange(Number(e.target.value))}
      />
    </Paper>
  )
}
