import { Avatar, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { MdImage } from 'react-icons/md'
import { resolveAssetUrl } from '../../api/client'
import type { Item } from '../../types/item'
import { categoryLabel } from '../../constants/items'
import { formatDateTime } from '../../utils/format'
import StatusChip from './StatusChip'
import TypeChip from './TypeChip'

/** Read-only table of items for the public list; each row opens the item. */
export default function ItemTable({ items }: { items: Item[] }) {
  const navigate = useNavigate()
  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 56 }} />
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Lost / found on</TableCell>
              <TableCell>Status</TableCell>
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
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
