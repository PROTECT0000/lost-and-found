import { useEffect, useRef, useState } from 'react'
import { Button, InputAdornment, Paper, Stack, TextField } from '@mui/material'
import { MdClear, MdSearch } from 'react-icons/md'
import { ITEM_CATEGORY_OPTIONS, ITEM_STATUS_OPTIONS } from '../../constants/items'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { ItemFilters as Filters } from '../../types/item'
import SelectField from '../common/SelectField'
import ItemTypeToggle from './ItemTypeToggle'

interface ItemFiltersProps {
  filters: Filters
  onChange: (change: Partial<Filters>, options?: { replace?: boolean }) => void
  onReset: () => void
}

export default function ItemFilters({ filters, onChange: setFilters, onReset }: ItemFiltersProps) {
  const [search, setSearch] = useState(filters.q ?? '')
  const debouncedSearch = useDebouncedValue(search)

  // Follow the URL when it changes underneath us (back/forward, Clear), but leave the box alone
  // when it already matches, so whitespace the user is still typing is kept.
  const [syncedQuery, setSyncedQuery] = useState(filters.q)
  if (filters.q !== syncedQuery) {
    setSyncedQuery(filters.q)
    if (search.trim() !== (filters.q ?? '')) setSearch(filters.q ?? '')
  }

  // Only push the search when the user typed something new, so a stale debounced value never
  // overwrites a query that just came from the URL. Typing replaces history instead of adding to it.
  const lastPushed = useRef(debouncedSearch)
  useEffect(() => {
    if (debouncedSearch === lastPushed.current) return
    lastPushed.current = debouncedSearch
    if ((filters.q ?? '') !== debouncedSearch.trim()) {
      setFilters({ q: debouncedSearch.trim() || undefined }, { replace: true })
    }
  }, [debouncedSearch, filters.q, setFilters])

  // The Lost/All/Found toggle is always visible with its own "All" option, so it alone does not
  // count as a filter to clear.
  const hasFilters = Boolean(filters.status || filters.category || filters.q)

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
              onReset()
            }}
          >
            Clear
          </Button>
        )}
      </Stack>
    </Paper>
  )
}
