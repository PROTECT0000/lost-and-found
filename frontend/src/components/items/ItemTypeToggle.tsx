import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import { MdReportProblem, MdViewModule, MdVolunteerActivism } from 'react-icons/md'
import type { ItemType } from '../../types/item'

interface ItemTypeToggleProps {
  value: ItemType | ''
  onChange: (value: ItemType | '') => void
  /** Show an "All" option (used for filtering). */
  includeAll?: boolean
  fullWidth?: boolean
}

export default function ItemTypeToggle({ value, onChange, includeAll, fullWidth }: ItemTypeToggleProps) {
  return (
    <ToggleButtonGroup
      exclusive
      color="primary"
      size="small"
      fullWidth={fullWidth}
      value={value}
      onChange={(_, next: ItemType | '' | null) => {
        if (next !== null) onChange(next)
      }}
    >
      {includeAll && (
        <ToggleButton value="" sx={{ gap: 0.75 }}>
          <MdViewModule /> All
        </ToggleButton>
      )}
      <ToggleButton value="lost" sx={{ gap: 0.75 }}>
        <MdReportProblem /> Lost
      </ToggleButton>
      <ToggleButton value="found" sx={{ gap: 0.75 }}>
        <MdVolunteerActivism /> Found
      </ToggleButton>
    </ToggleButtonGroup>
  )
}
