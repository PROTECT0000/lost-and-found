import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { Item } from '../types/item'
import { EXPORT_COLUMNS, describeFilters, exportFileName, toExcelLocalDate } from './exportItems'

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

describe('describeFilters', () => {
  it('summarises active filters', () => {
    expect(describeFilters({ type: 'found', category: 'keys', status: 'resolved', q: 'car' })).toBe(
      'Type: Found · Category: Keys · Status: Resolved · Search: "car"',
    )
  })

  it('says "All items" without filters', () => {
    expect(describeFilters({})).toBe('All items')
  })
})

describe('exportFileName', () => {
  it('includes the date, time and extension', () => {
    expect(exportFileName('pdf', dayjs('2026-10-21T14:05:00'))).toBe('lost-and-found-items-2026-10-21-1405.pdf')
  })
})
