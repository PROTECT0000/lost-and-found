import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { Item } from '../types/item'
import {
  EXPORT_COLUMNS,
  describeReported,
  exportFileName,
  filterDetails,
  summarizeItems,
  toExcelLocalDate,
} from './exportItems'

const item: Item = {
  id: '1',
  type: 'lost',
  title: 'Black wallet',
  description: 'Leather, two cards inside',
  category: 'wallet',
  location: 'Library',
  occurred_at: '2026-10-21T02:30:00Z',
  contact_name: 'Ana',
  contact_info: 'ana@example.com',
  image_key: 'items/abc.png',
  image_url: '/api/uploads/items/abc.png',
  status: 'open',
  resolved_by: null,
  resolution_note: null,
  resolved_at: null,
  created_at: '2026-10-21T03:00:00Z',
  updated_at: '2026-10-21T03:00:00Z',
}

// Tests run in Asia/Jakarta (UTC+7), see vitest.config.ts.
describe('EXPORT_COLUMNS', () => {
  it('renders a row with labels and local times, and no image', () => {
    expect(EXPORT_COLUMNS.map((c) => c.text(item))).toEqual([
      'Black wallet',
      'Lost',
      'Wallet',
      'Open',
      'Library',
      '21 Oct 2026, 09:30',
      'Leather, two cards inside',
      'Ana',
      'ana@example.com',
      '21 Oct 2026, 10:00',
    ])
    expect(EXPORT_COLUMNS.map((c) => c.header).join(' ')).not.toMatch(/image|photo/i)
  })
})

describe('toExcelLocalDate', () => {
  it('stores the local wall-clock time in the UTC fields Excel reads', () => {
    expect(toExcelLocalDate('2026-10-21T02:30:00Z').toISOString()).toBe('2026-10-21T09:30:00.000Z')
  })
})

describe('filterDetails', () => {
  it('lists every filter, with "All" for the unset ones and the default sort', () => {
    expect(filterDetails({})).toEqual([
      { label: 'Type', value: 'All' },
      { label: 'Category', value: 'All' },
      { label: 'Status', value: 'All' },
      { label: 'Search', value: 'None' },
      { label: 'Reported', value: 'Any date' },
      { label: 'Sorted by', value: 'Reported, descending' },
    ])
  })

  it('describes active filters', () => {
    const details = filterDetails({ type: 'found', category: 'keys', status: 'resolved', q: 'car', sort: 'title', order: 'asc' })
    expect(details.map((d) => d.value)).toEqual(['Found', 'Keys', 'Resolved', '"car"', 'Any date', 'Title, ascending'])
  })
})

describe('describeReported', () => {
  // `to` is exclusive: the start of the day after the last day.
  it('shows whole days', () => {
    const from = '2026-10-01T00:00:00+07:00'
    const to = '2026-11-01T00:00:00+07:00'
    expect(describeReported({ from, to })).toBe('01 Oct 2026 – 31 Oct 2026')
    expect(describeReported({ from, to: '2026-10-02T00:00:00+07:00' })).toBe('01 Oct 2026')
    expect(describeReported({ from })).toBe('From 01 Oct 2026')
    expect(describeReported({ to })).toBe('Until 31 Oct 2026')
    expect(describeReported({})).toBeUndefined()
  })
})

describe('summarizeItems', () => {
  it('counts the exported items by status, type and category', () => {
    const s = summarizeItems([
      item,
      { ...item, id: '2', status: 'resolved' },
      { ...item, id: '3', type: 'found', category: 'keys' },
    ])
    expect(s).toMatchObject({ total: 3, open: 2, resolved: 1, lost: 2, found: 1 })
    expect(s.byCategory.map((c) => [c.category, c.count])).toEqual([
      ['wallet', 2],
      ['keys', 1],
    ])
    expect(s.byType).toEqual([
      { type: 'lost', label: 'Lost', open: 1, resolved: 1 },
      { type: 'found', label: 'Found', open: 1, resolved: 0 },
    ])
  })
})

describe('exportFileName', () => {
  it('includes the date, time and extension', () => {
    expect(exportFileName('pdf', dayjs('2026-10-21T14:05:00'))).toBe('lost-and-found-items-2026-10-21-1405.pdf')
  })
})
