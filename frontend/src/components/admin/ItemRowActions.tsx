import { IconButton, Stack, Tooltip } from '@mui/material'
import { MdCheckCircle, MdDelete, MdEdit, MdReplay, MdVisibility } from 'react-icons/md'
import type { Item } from '../../types/item'

interface ItemRowActionsProps {
  item: Item
  disabled?: boolean
  onView: (item: Item) => void
  onEdit: (item: Item) => void
  onToggleStatus: (item: Item) => void
  onDelete: (item: Item) => void
}

export default function ItemRowActions({ item, disabled, onView, onEdit, onToggleStatus, onDelete }: ItemRowActionsProps) {
  const resolved = item.status === 'resolved'
  return (
    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
      <Tooltip title="View">
        <IconButton size="small" onClick={() => onView(item)}>
          <MdVisibility />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton size="small" color="primary" onClick={() => onEdit(item)}>
          <MdEdit />
        </IconButton>
      </Tooltip>
      <Tooltip title={resolved ? 'Reopen' : 'Mark resolved'}>
        <span>
          <IconButton size="small" color="success" disabled={disabled} onClick={() => onToggleStatus(item)}>
            {resolved ? <MdReplay /> : <MdCheckCircle />}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Delete">
        <span>
          <IconButton size="small" color="error" disabled={disabled} onClick={() => onDelete(item)}>
            <MdDelete />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  )
}
