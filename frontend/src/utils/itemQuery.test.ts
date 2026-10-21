import { describe, expect, it } from 'vitest'
import {
  activeSort,
  itemFiltersToParams,
  parseItemFilters,
  parseViewMode,
  sortChange,
  updateItemFilters,
} from './itemQuery'

const parse = (query: string) => parseItemFilters(new URLSearchParams(query))

describe('parseItemFilters', () => {
  it('defaults to page 1 with the default page size', () => {
    expect(parse('')).toEqual({ page: 1, limit: 12 })
  })

  it('reads every filter from the URL', () => {
    expect(parse('q=wallet&type=lost&category=keys&status=open&page=3&limit=48')).toEqual({
      q: 'wallet',
      type: 'lost',
      category: 'keys',
      status: 'open',
      page: 3,
      limit: 48,
    })
  })

  it('ignores unknown or malformed values', () => {
    expect(parse('type=stolen&category=car&status=x&page=-2&limit=1000')).toEqual({ page: 1, limit: 12 })
    expect(parse('page=2.5&limit=abc')).toEqual({ page: 1, limit: 12 })
  })

  it('drops a blank search', () => {
    expect(parse('q=%20%20').q).toBeUndefined()
  })
})

describe('itemFiltersToParams', () => {
  it('leaves defaults out of the URL', () => {
    expect(itemFiltersToParams({ page: 1, limit: 12 }).toString()).toBe('')
  })

  it('round-trips through parseItemFilters', () => {
    const filters = { q: 'red bag', type: 'found' as const, status: 'resolved' as const, page: 2, limit: 24 }
    expect(parseItemFilters(itemFiltersToParams(filters))).toEqual(filters)
  })
})

describe('updateItemFilters', () => {
  const current = { page: 3, limit: 12, type: 'lost' as const }

  it('goes back to page 1 when any filter other than page changes', () => {
    expect(updateItemFilters(current, { category: 'keys' })).toEqual({ ...current, page: 1, category: 'keys' })
    expect(updateItemFilters(current, { limit: 48 })).toMatchObject({ page: 1, limit: 48 })
  })

  it('keeps the page when the page itself changes', () => {
    expect(updateItemFilters(current, { page: 5 })).toEqual({ ...current, page: 5 })
  })

  it('clears a filter set to undefined', () => {
    expect(itemFiltersToParams(updateItemFilters(current, { type: undefined })).toString()).toBe('')
  })
})

describe('parseViewMode', () => {
  it('defaults to cards and only accepts "table"', () => {
    expect(parseViewMode(new URLSearchParams(''))).toBe('card')
    expect(parseViewMode(new URLSearchParams('view=table'))).toBe('table')
    expect(parseViewMode(new URLSearchParams('view=list'))).toBe('card')
  })
})

describe('sorting', () => {
  const base = { page: 1, limit: 12 }

  it('round-trips a sort through the URL and keeps defaults out of it', () => {
    expect(parse('sort=title&order=asc')).toMatchObject({ sort: 'title', order: 'asc' })
    expect(parse('sort=created_at&order=desc')).toEqual(base)
    expect(parse('sort=contact_info&order=up')).toEqual(base)
    expect(itemFiltersToParams({ ...base, sort: 'title', order: 'asc' }).toString()).toBe('sort=title&order=asc')
  })

  it('starts text columns A–Z and dates newest first, then flips the active column', () => {
    expect(sortChange(base, 'title')).toEqual({ sort: 'title', order: 'asc' })
    expect(sortChange(base, 'occurred_at')).toEqual({ sort: 'occurred_at', order: undefined })
    expect(sortChange({ ...base, sort: 'title', order: 'asc' }, 'title')).toEqual({ sort: 'title', order: undefined })
    // created_at descending is the default, so clicking it flips to oldest first.
    expect(sortChange(base, 'created_at')).toEqual({ sort: undefined, order: 'asc' })
    expect(activeSort(base)).toEqual({ field: 'created_at', order: 'desc' })
  })
})
