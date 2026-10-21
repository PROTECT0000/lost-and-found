import { useEffect, useState } from 'react'
import { Button, Stack } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { MdAdd } from 'react-icons/md'
import { useAdminStore } from '../store/useAdminStore'
import { useSnackbarStore } from '../store/useSnackbarStore'
import { useItemStore } from '../store/useItemStore'
import { useItemList } from '../hooks/useItemList'
import { useItemActions } from '../hooks/useItemActions'
import { getErrorMessage } from '../api/client'
import type { Item, ItemInput } from '../types/item'
import PageHeader from '../components/common/PageHeader'
import ErrorState from '../components/common/ErrorState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import ResolveItemDialog from '../components/items/ResolveItemDialog'
import ItemFilters from '../components/items/ItemFilters'
import StatsOverview from '../components/admin/StatsOverview'
import ItemsTable from '../components/admin/ItemsTable'
import ExportMenu from '../components/admin/ExportMenu'
import ItemDialog, { type ItemDialogMode } from '../components/admin/ItemDialog'

export default function AdminDashboardPage() {
  const { stats, error: statsError, fetchStats } = useAdminStore()
  const { items, meta, filters, loading, error, setFilters, refresh } = useItemList()
  const saving = useItemStore((s) => s.saving)
  const updateItem = useItemStore((s) => s.updateItem)
  const showSnackbar = useSnackbarStore((s) => s.show)
  const { toggleStatus, remove, resolveDialog } = useItemActions({ onStatusChange: () => fetchStats() })
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null)
  // The item open in the view/edit dialog. Looked up in the list so edits show up right away.
  const [dialog, setDialog] = useState<{ id: string; mode: ItemDialogMode } | null>(null)
  const dialogItem = dialog ? (items.find((i) => i.id === dialog.id) ?? null) : null
  const openDialog = (mode: ItemDialogMode) => (item: Item) => setDialog({ id: item.id, mode })

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleDelete = async () => {
    if (!pendingDelete) return
    const deleted = await remove(pendingDelete)
    setPendingDelete(null)
    if (deleted) {
      setDialog(null)
      fetchStats()
      refresh()
    }
  }

  const handleSave = async (values: ItemInput) => {
    if (!dialog) return
    try {
      await updateItem(dialog.id, values)
      showSnackbar('Item updated')
      setDialog({ ...dialog, mode: 'view' })
      fetchStats()
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Admin dashboard"
        action={
          <Stack direction="row" spacing={1}>
            <ExportMenu filters={filters} disabled={loading || meta.total === 0} />
            <Button variant="contained" component={RouterLink} to="/items/new" startIcon={<MdAdd />}>
              New item
            </Button>
          </Stack>
        }
      />
      {statsError && <ErrorState message={statsError} onRetry={fetchStats} />}
      <StatsOverview stats={stats} />
      <ItemFilters filters={filters} onChange={setFilters} />
      {error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <ItemsTable
          items={items}
          meta={meta}
          filters={filters}
          loading={loading}
          busy={saving}
          onSort={setFilters}
          onView={openDialog('view')}
          onEdit={openDialog('edit')}
          onPageChange={(page) => setFilters({ page })}
          onRowsPerPageChange={(limit) => setFilters({ limit })}
          onToggleStatus={toggleStatus}
          onDelete={setPendingDelete}
        />
      )}
      <ItemDialog
        item={dialogItem}
        mode={dialog?.mode ?? 'view'}
        saving={saving}
        onModeChange={(mode) => dialog && setDialog({ ...dialog, mode })}
        onSave={handleSave}
        onToggleStatus={toggleStatus}
        onDelete={setPendingDelete}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete item?"
        message={`"${pendingDelete?.title}" will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete"
        loading={saving}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
      <ResolveItemDialog {...resolveDialog} />
    </>
  )
}
