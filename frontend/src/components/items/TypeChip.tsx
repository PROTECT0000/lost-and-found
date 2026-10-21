import { Chip } from '@mui/material'
import { MdReportProblem, MdVolunteerActivism } from 'react-icons/md'
import type { ItemType } from '../../types/item'

export default function TypeChip({ type }: { type: ItemType }) {
  const isLost = type === 'lost'
  return (
    <Chip
      size="small"
      color={isLost ? 'warning' : 'primary'}
      icon={isLost ? <MdReportProblem /> : <MdVolunteerActivism />}
      label={isLost ? 'Lost' : 'Found'}
    />
  )
}
