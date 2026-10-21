import type { ItemFilters, SortField, SortOrder, ViewMode } from '../types/item'
import {
  DEFAULT_PAGE_SIZE,
  ITEM_CATEGORY_OPTIONS,
  ITEM_STATUS_OPTIONS,
  ITEM_TYPE_OPTIONS,
  PAGE_SIZE_OPTIONS,
  SORT_FIELDS,
} from '../constants/items'

const pick = <T extends string>(value: string | null, options: { value: T }[]): T | undefined =>
  options.find((o) => o.value === value)?.value

/**
 * Reads list filters from URL search params. Unknown or malformed values fall back to the
 * defaults, so a hand-edited or stale link never produces an invalid API request.
 */
export function parseItemFilters(params: URLSearchParams): ItemFilters {
  const page = Number(params.get('page'))
  const limit = Number(params.get('limit'))
  const q = params.get('q')?.trim()
  const sort = SORT_FIELDS.find((f) => f === params.get('sort'))
  return {
    type: pick(params.get('type'), ITEM_TYPE_OPTIONS),
    status: pick(params.get('status'), ITEM_STATUS_OPTIONS),
    category: pick(params.get('category'), ITEM_CATEGORY_OPTIONS),
    q: q || undefined,
    // Defaults (created_at, descending) are stored as undefined so each order has one URL.
    sort: sort === 'created_at' ? undefined : sort,
    order: params.get('order') === 'asc' ? 'asc' : undefined,
    page: Number.isInteger(page) && page > 1 ? page : 1,
    limit: PAGE_SIZE_OPTIONS.includes(limit) ? limit : DEFAULT_PAGE_SIZE,
  }
}

/** Dates start newest first; text columns start A–Z. */
const firstOrder = (field: SortField): SortOrder => (field === 'created_at' || field === 'occurred_at' ? 'desc' : 'asc')

/** The active sort column and direction, with defaults filled in. */
export function activeSort(filters: ItemFilters): { field: SortField; order: SortOrder } {
  return { field: filters.sort ?? 'created_at', order: filters.order ?? 'desc' }
}

/**
 * The filter change for clicking a column header: the active column flips direction, another
 * column starts in its natural direction.
 */
export function sortChange(filters: ItemFilters, field: SortField): Pick<ItemFilters, 'sort' | 'order'> {
  const current = activeSort(filters)
  const order = current.field === field ? (current.order === 'asc' ? 'desc' : 'asc') : firstOrder(field)
  return { sort: field === 'created_at' ? undefined : field, order: order === 'asc' ? 'asc' : undefined }
}

/** Reads the home page view mode; the card grid is the default and is left out of the URL. */
export function parseViewMode(params: URLSearchParams): ViewMode {
  return params.get('view') === 'table' ? 'table' : 'card'
}

/** Writes filters to URL search params, leaving out defaults to keep links short. */
export function itemFiltersToParams(filters: ItemFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.type) params.set('type', filters.type)
  if (filters.category) params.set('category', filters.category)
  if (filters.status) params.set('status', filters.status)
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.order) params.set('order', filters.order)
  if (filters.page > 1) params.set('page', String(filters.page))
  if (filters.limit !== DEFAULT_PAGE_SIZE) params.set('limit', String(filters.limit))
  return params
}

/** Applies a filter change. Any change other than the page itself goes back to page 1. */
export function updateItemFilters(current: ItemFilters, change: Partial<ItemFilters>): ItemFilters {
  return { ...current, page: 1, ...change }
}
