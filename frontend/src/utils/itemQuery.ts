import type { ItemFilters, ViewMode } from '../types/item'
import {
  DEFAULT_PAGE_SIZE,
  ITEM_CATEGORY_OPTIONS,
  ITEM_STATUS_OPTIONS,
  ITEM_TYPE_OPTIONS,
  PAGE_SIZE_OPTIONS,
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
  return {
    type: pick(params.get('type'), ITEM_TYPE_OPTIONS),
    status: pick(params.get('status'), ITEM_STATUS_OPTIONS),
    category: pick(params.get('category'), ITEM_CATEGORY_OPTIONS),
    q: q || undefined,
    page: Number.isInteger(page) && page > 1 ? page : 1,
    limit: PAGE_SIZE_OPTIONS.includes(limit) ? limit : DEFAULT_PAGE_SIZE,
  }
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
  if (filters.page > 1) params.set('page', String(filters.page))
  if (filters.limit !== DEFAULT_PAGE_SIZE) params.set('limit', String(filters.limit))
  return params
}

/** Applies a filter change. Any change other than the page itself goes back to page 1. */
export function updateItemFilters(current: ItemFilters, change: Partial<ItemFilters>): ItemFilters {
  return { ...current, page: 1, ...change }
}
