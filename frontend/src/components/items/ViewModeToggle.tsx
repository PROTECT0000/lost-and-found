import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material'
import { MdTableRows, MdViewModule } from 'react-icons/md'
import type { ViewMode } from '../../types/item'

interface ViewModeToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
}

export default function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <ToggleButtonGroup
      exclusive
      color="primary"
      size="small"
      value={value}
      onChange={(_, next: ViewMode | null) => {
        if (next !== null) onChange(next)
      }}
      aria-label="View"
    >
      <Tooltip title="Card view">
        <ToggleButton value="card" aria-label="Card view">
          <MdViewModule size={20} />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Table view">
        <ToggleButton value="table" aria-label="Table view">
          <MdTableRows size={20} />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  )
}
