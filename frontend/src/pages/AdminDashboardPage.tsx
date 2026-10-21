import { useEffect, useState } from 'react'
import { Button } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { MdAdd } from 'react-icons/md'
import { useAdminStore } from '../store/useAdminStore'
import { useItemStore } from '../store/useItemStore'
import { useItemActions } from '../hooks/useItemActions'
import type { Item } from '../types/item'
import PageHeader from '../components/common/PageHeader'
import ErrorState from '../components/common/ErrorState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import ItemFilters from '../components/items/ItemFilters'
import StatsOverview from '../components/admin/StatsOverview'
import ItemsTable from '../components/admin/ItemsTable'

export default function AdminDashboardPage() {
  const { stats, error: statsError, fetchStats } = useAdminStore()
  const { items, meta, filters, loading, saving, error, fetchItems, setFilters } = useItemStore()
  const { toggleStatus, remove } = useItemActions()
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null)

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchItems()
  }, [filters, fetchItems])

  const handleToggleStatus = async (item: Item) => {
    if (await toggleStatus(item)) fetchStats()
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    const deleted = await remove(pendingDelete)
    setPendingDelete(null)
    if (deleted) {
      fetchStats()
      fetchItems()
    }
  }

  return (
    <>
      <PageHeader
        title="Admin dashboard"
        action={
          <Button variant="contained" component={RouterLink} to="/items/new" startIcon={<MdAdd />}>
            New item
          </Button>
        }
      />
      {statsError && <ErrorState message={statsError} onRetry={fetchStats} />}
      <StatsOverview stats={stats} />
      <ItemFilters />
      {error ? (
        <ErrorState message={error} onRetry={fetchItems} />
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
