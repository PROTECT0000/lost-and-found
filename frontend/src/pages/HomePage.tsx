import { Button, Stack } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { MdAdd } from 'react-icons/md'
import { useItemList } from '../hooks/useItemList'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import LoadingState from '../components/common/LoadingState'
import ItemFilters from '../components/items/ItemFilters'
import ItemGrid from '../components/items/ItemGrid'
import ItemTable from '../components/items/ItemTable'
import ViewModeToggle from '../components/items/ViewModeToggle'
import ItemsPagination from '../components/items/ItemsPagination'

export default function HomePage() {
  const { items, meta, filters, loading, error, setFilters, refresh, viewMode, setViewMode } = useItemList()

  // Like the admin dashboard, the table stays on screen while a page loads and carries its own
  // sortable headers and pagination.
  const renderTable = () => (
    <ItemTable
      items={items}
      meta={meta}
      filters={filters}
      loading={loading}
      onSort={setFilters}
      onPageChange={(page) => setFilters({ page })}
      onRowsPerPageChange={(limit) => setFilters({ limit })}
    />
  )

  const renderCards = () => {
    if (loading) return <LoadingState />
    if (items.length === 0) {
      return (
        <EmptyState
          title="No items found"
          description="Try adjusting the filters, or report a new lost or found item."
          action={
            <Button variant="contained" component={RouterLink} to="/items/new" startIcon={<MdAdd />}>
              Report item
            </Button>
          }
        />
      )
    }
    return (
      <>
        <ItemGrid items={items} />
        <ItemsPagination
          meta={meta}
          onPageChange={(page) => setFilters({ page })}
          onPageSizeChange={(limit) => setFilters({ limit })}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Lost & Found"
        action={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <Button variant="contained" component={RouterLink} to="/items/new" startIcon={<MdAdd />}>
              Report item
            </Button>
          </Stack>
        }
      />
      <ItemFilters filters={filters} onChange={setFilters} />
      {error ? <ErrorState message={error} onRetry={refresh} /> : viewMode === 'table' ? renderTable() : renderCards()}
    </>
  )
}
