import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useItemStore } from '../store/useItemStore'
import type { ItemFilters, ViewMode } from '../types/item'
import { itemFiltersToParams, parseItemFilters, parseViewMode, updateItemFilters } from '../utils/itemQuery'

/**
 * A paginated, filtered item list whose filters live in the page URL, so each page keeps its
 * own state and refresh, back/forward and shared links restore it.
 */
export function useItemList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { items, meta, loading, error, fetchItems } = useItemStore()

  // searchParams only changes identity when the URL's query string does.
  const filters = useMemo(() => parseItemFilters(searchParams), [searchParams])
  const viewMode = parseViewMode(searchParams)

  const setFilters = useCallback(
    (change: Partial<ItemFilters>, options?: { replace?: boolean }) =>
      setSearchParams((prev) => {
        const next = itemFiltersToParams(updateItemFilters(parseItemFilters(prev), change))
        // The view mode is not a filter, but it lives in the same URL and must survive filter changes.
        if (parseViewMode(prev) === 'table') next.set('view', 'table')
        return next
      }, options),
    [setSearchParams],
  )
  // Clear only resets search, category and status; the Lost/Found toggle and page size stay.
  const resetFilters = useCallback(
    () => setFilters({ q: undefined, category: undefined, status: undefined }),
    [setFilters],
  )
  const setViewMode = useCallback(
    (mode: ViewMode) =>
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (mode === 'table') next.set('view', 'table')
        else next.delete('view')
        return next
      }),
    [setSearchParams],
  )
  const refresh = useCallback(() => fetchItems(filters), [fetchItems, filters])

  useEffect(() => {
    fetchItems(filters)
  }, [filters, fetchItems])

  // Past the last page (stale link, or the last item on the last page was deleted): jump back.
  const lastPage = Math.max(1, Math.ceil(meta.total / meta.limit))
  const pastEnd = !loading && !error && items.length === 0 && meta.total > 0 && filters.page > lastPage
  useEffect(() => {
    if (pastEnd) setFilters({ page: lastPage }, { replace: true })
  }, [pastEnd, lastPage, setFilters])

  return { items, meta, loading, error, filters, setFilters, resetFilters, refresh, viewMode, setViewMode }
}
