import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, parseServerDate } from './format'

// Tests run in Asia/Jakarta (UTC+7), see vitest.config.ts.
describe('parseServerDate', () => {
  it('treats SQLite datetime("now") values as UTC', () => {
    expect(parseServerDate('2026-10-21 01:48:25').toISOString()).toBe('2026-10-21T01:48:25.000Z')
  })

  it('keeps ISO strings with a timezone as-is', () => {
    expect(parseServerDate('2026-10-21T02:30:00.000Z').toISOString()).toBe('2026-10-21T02:30:00.000Z')
  })
})

describe('formatDateTime / formatDate', () => {
  it('shows server timestamps in local time', () => {
    expect(formatDateTime('2026-10-21 01:48:25')).toBe('21 Oct 2026, 08:48')
  })

  it('rolls over to the next local day when needed', () => {
    expect(formatDate('2026-10-21 20:00:00')).toBe('22 Oct 2026')
    expect(formatDateTime('2026-10-21T20:00:00.000Z')).toBe('22 Oct 2026, 03:00')
  })
})
