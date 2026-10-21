import { Chip } from '@mui/material'
import { MdCheckCircle, MdSchedule } from 'react-icons/md'
import type { ItemStatus } from '../../types/item'

export default function StatusChip({ status }: { status: ItemStatus }) {
  const resolved = status === 'resolved'
  return (
    <Chip
      size="small"
      variant="outlined"
      color={resolved ? 'success' : 'default'}
      icon={resolved ? <MdCheckCircle /> : <MdSchedule />}
      label={resolved ? 'Resolved' : 'Open'}
    />
  )
}
