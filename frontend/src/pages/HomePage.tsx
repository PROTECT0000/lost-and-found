import { useEffect } from 'react'
import { Box, Button, Pagination } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { MdAdd } from 'react-icons/md'
import { useItemStore } from '../store/useItemStore'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import LoadingState from '../components/common/LoadingState'
import ItemFilters from '../components/items/ItemFilters'
import ItemGrid from '../components/items/ItemGrid'

export default function HomePage() {
  const { items, meta, filters, loading, error, fetchItems, setFilters } = useItemStore()
  const pageCount = Math.ceil(meta.total / meta.limit)

  useEffect(() => {
    fetchItems()
  }, [filters, fetchItems])

  const renderContent = () => {
    if (error) return <ErrorState message={error} onRetry={fetchItems} />
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
    return <ItemGrid items={items} />
  }

  return (
    <>
      <PageHeader
        title="Lost & Found"
        action={
          <Button variant="contained" component={RouterLink} to="/items/new" startIcon={<MdAdd />}>
            Report item
          </Button>
        }
      />
      <ItemFilters />
      {renderContent()}
      {pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            color="primary"
            count={pageCount}
            page={filters.page}
            onChange={(_, page) => setFilters({ page })}
          />
        </Box>
      )}
    </>
  )
}
