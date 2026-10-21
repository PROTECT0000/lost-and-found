import { useEffect, useState } from 'react'
import { Button, Stack } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { MdAdd } from 'react-icons/md'
import { useAdminStore } from '../store/useAdminStore'
import { useItemStore } from '../store/useItemStore'
import { useItemList } from '../hooks/useItemList'
import { useItemActions } from '../hooks/useItemActions'
import type { Item } from '../types/item'
import PageHeader from '../components/common/PageHeader'
import ErrorState from '../components/common/ErrorState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import ItemFilters from '../components/items/ItemFilters'
import StatsOverview from '../components/admin/StatsOverview'
import ItemsTable from '../components/admin/ItemsTable'
import ExportMenu from '../components/admin/ExportMenu'

export default function AdminDashboardPage() {
  const { stats, error: statsError, fetchStats } = useAdminStore()
  const { items, meta, filters, loading, error, setFilters, resetFilters, refresh } = useItemList()
  const saving = useItemStore((s) => s.saving)
  const { toggleStatus, remove } = useItemActions()
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null)

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleToggleStatus = async (item: Item) => {
    if (await toggleStatus(item)) fetchStats()
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    const deleted = await remove(pendingDelete)
    setPendingDelete(null)
    if (deleted) {
      fetchStats()
      refresh()
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
      <ItemFilters filters={filters} onChange={setFilters} onReset={resetFilters} />
      {error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <ItemsTable
          items={items}
          meta={meta}
          loading={loading}
          busy={saving}
          onPageChange={(page) => setFilters({ page })}
          onRowsPerPageChange={(limit) => setFilters({ limit })}
          onToggleStatus={handleToggleStatus}
          onDelete={setPendingDelete}
        />
      )}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete item?"
        message={`"${pendingDelete?.title}" will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete"
        loading={saving}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
