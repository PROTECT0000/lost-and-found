import { useState } from 'react'
import { Button, CircularProgress, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material'
import { MdFileDownload, MdPictureAsPdf, MdTableChart } from 'react-icons/md'
import { itemsApi } from '../../api/items'
import { getErrorMessage } from '../../api/client'
import { useSnackbarStore } from '../../store/useSnackbarStore'
import type { ItemFilters } from '../../types/item'
import { exportItems, type ExportFormat } from '../../utils/exportItems'

interface ExportMenuProps {
  /** Exports every item matching these filters, across all pages. */
  filters: ItemFilters
  disabled?: boolean
}

export default function ExportMenu({ filters, disabled }: ExportMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [exporting, setExporting] = useState(false)
  const showSnackbar = useSnackbarStore((s) => s.show)

  const handleExport = async (format: ExportFormat) => {
    setAnchor(null)
    setExporting(true)
    try {
      const { page: _page, limit: _limit, ...rest } = filters
      const items = await itemsApi.listAll(rest)
      await exportItems(format, items, rest)
      showSnackbar(`Exported ${items.length} item${items.length === 1 ? '' : 's'}`)
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        disabled={disabled || exporting}
        onClick={(e) => setAnchor(e.currentTarget)}
        startIcon={exporting ? <CircularProgress size={16} /> : <MdFileDownload />}
      >
        {exporting ? 'Exporting…' : 'Export'}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => handleExport('xlsx')}>
          <ListItemIcon>
            <MdTableChart size={20} />
          </ListItemIcon>
          <ListItemText primary="Excel (.xlsx)" secondary="All matching items" />
        </MenuItem>
        <MenuItem onClick={() => handleExport('pdf')}>
          <ListItemIcon>
            <MdPictureAsPdf size={20} />
          </ListItemIcon>
          <ListItemText primary="PDF" secondary="All matching items" />
        </MenuItem>
      </Menu>
    </>
  )
}
