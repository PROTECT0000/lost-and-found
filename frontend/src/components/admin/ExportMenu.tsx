import { useState } from 'react'
import { Button } from '@mui/material'
import { MdFileDownload } from 'react-icons/md'
import { itemsApi } from '../../api/items'
import { getErrorMessage } from '../../api/client'
import { useSnackbarStore } from '../../store/useSnackbarStore'
import type { ItemFilters } from '../../types/item'
import { exportItems, type ExportFilters, type ExportFormat } from '../../utils/exportItems'
import ExportDialog from './ExportDialog'

interface ExportMenuProps {
  /** The dashboard's filters; the export dialog starts from these. */
  filters: ItemFilters
  disabled?: boolean
}

export default function ExportMenu({ filters, disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const showSnackbar = useSnackbarStore((s) => s.show)
  const { page: _page, limit: _limit, ...initialFilters } = filters

  const handleExport = async (format: ExportFormat, exportFilters: ExportFilters) => {
    setExporting(true)
    try {
      const items = await itemsApi.listAll(exportFilters)
      await exportItems(format, items, exportFilters)
      showSnackbar(`Exported ${items.length} item${items.length === 1 ? '' : 's'}`)
      setOpen(false)
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Button variant="outlined" disabled={disabled} onClick={() => setOpen(true)} startIcon={<MdFileDownload />}>
        Export
      </Button>
      <ExportDialog
        open={open}
        initialFilters={initialFilters}
        exporting={exporting}
        onExport={handleExport}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
