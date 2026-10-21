import { Button, Stack } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { MdCheckCircle, MdDelete, MdEdit, MdReplay } from 'react-icons/md'
import type { Item } from '../../types/item'

interface ItemActionsProps {
  item: Item
  busy?: boolean
  onToggleStatus: () => void
  onDelete: () => void
  /** Edit in place (e.g. a dialog) instead of navigating to the edit page. */
  onEdit?: () => void
}

export default function ItemActions({ item, busy, onToggleStatus, onDelete, onEdit }: ItemActionsProps) {
  const resolved = item.status === 'resolved'
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
      {onEdit ? (
        <Button variant="outlined" startIcon={<MdEdit />} onClick={onEdit} disabled={busy}>
          Edit
        </Button>
      ) : (
        <Button variant="outlined" startIcon={<MdEdit />} component={RouterLink} to={`/items/${item.id}/edit`}>
          Edit
        </Button>
      )}
      <Button
        variant="contained"
        color={resolved ? 'secondary' : 'success'}
        startIcon={resolved ? <MdReplay /> : <MdCheckCircle />}
        onClick={onToggleStatus}
        disabled={busy}
      >
        {resolved ? 'Reopen' : 'Mark resolved'}
      </Button>
      <Button variant="outlined" color="error" startIcon={<MdDelete />} onClick={onDelete} disabled={busy}>
        Delete
      </Button>
    </Stack>
  )
}
