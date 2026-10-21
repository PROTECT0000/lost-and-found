import { useEffect, useState } from 'react'
import { Button, InputAdornment, Paper, Stack, TextField } from '@mui/material'
import { MdClear, MdSearch } from 'react-icons/md'
import { ITEM_CATEGORY_OPTIONS, ITEM_STATUS_OPTIONS } from '../../constants/items'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useItemStore } from '../../store/useItemStore'
import SelectField from '../common/SelectField'
import ItemTypeToggle from './ItemTypeToggle'

export default function ItemFilters() {
  const filters = useItemStore((s) => s.filters)
  const setFilters = useItemStore((s) => s.setFilters)
  const resetFilters = useItemStore((s) => s.resetFilters)

  const [search, setSearch] = useState(filters.q ?? '')
  const debouncedSearch = useDebouncedValue(search)

  useEffect(() => {
    if ((filters.q ?? '') !== debouncedSearch) {
      setFilters({ q: debouncedSearch || undefined })
    }
  }, [debouncedSearch, filters.q, setFilters])

  const hasFilters = Boolean(filters.type || filters.status || filters.category || filters.q)

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
        <TextField
          size="small"
          placeholder="Search title, description or location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <MdSearch size={20} />
                </InputAdornment>
              ),
            },
          }}
        />
        <ItemTypeToggle
          includeAll
          value={filters.type ?? ''}
          onChange={(type) => setFilters({ type: type || undefined })}
        />
        <SelectField
          size="small"
          label="Category"
          allLabel="All categories"
          options={ITEM_CATEGORY_OPTIONS}
          value={filters.category ?? ''}
          onChange={(category) => setFilters({ category: category || undefined })}
          sx={{ minWidth: 170 }}
        />
        <SelectField
          size="small"
          label="Status"
          allLabel="All statuses"
          options={ITEM_STATUS_OPTIONS}
          value={filters.status ?? ''}
          onChange={(status) => setFilters({ status: status || undefined })}
          sx={{ minWidth: 150 }}
        />
        {hasFilters && (
          <Button
            startIcon={<MdClear />}
            onClick={() => {
              setSearch('')
              resetFilters()
            }}
          >
            Clear
          </Button>
        )}
      </Stack>
    </Paper>
  )
}
