import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { mergeDate, mergeTime } from './dateTime'

const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD HH:mm:ss.SSS')

describe('mergeDate', () => {
  it('takes the day from the picked date and keeps the current time', () => {
    const current = dayjs('2026-10-10T14:35:00')
    expect(fmt(mergeDate(current, dayjs('2026-10-18T00:00:00')))).toBe('2026-10-18 14:35:00.000')
  })

  it('ignores any time carried by the picked date', () => {
    const current = dayjs('2026-10-10T14:35:00')
    expect(fmt(mergeDate(current, dayjs('2026-10-18T09:00:00')))).toBe('2026-10-18 14:35:00.000')
  })

  it('does not overflow when moving from a long month to a shorter one', () => {
    const current = dayjs('2026-01-31T10:00:00')
    expect(fmt(mergeDate(current, dayjs('2026-02-15T00:00:00')))).toBe('2026-02-15 10:00:00.000')
  })

  it('handles leap days', () => {
    const current = dayjs('2028-02-29T08:00:00')
    expect(fmt(mergeDate(current, dayjs('2027-03-01T00:00:00')))).toBe('2027-03-01 08:00:00.000')
  })

  it('uses the current time (without seconds) when nothing is set yet', () => {
    const now = dayjs('2026-10-21T09:41:27.123')
    expect(fmt(mergeDate(null, dayjs('2026-10-20T00:00:00'), now))).toBe('2026-10-20 09:41:00.000')
  })
})

describe('mergeTime', () => {
  it('takes hours and minutes from the picked time and keeps the current day', () => {
    const current = dayjs('2026-10-18T14:35:00')
    expect(fmt(mergeTime(current, dayjs('2000-01-01T07:05:59')))).toBe('2026-10-18 07:05:00.000')
  })

  it('uses today when nothing is set yet', () => {
    const now = dayjs('2026-10-21T09:41:27')
    expect(fmt(mergeTime(null, dayjs('2000-01-01T22:15:00'), now))).toBe('2026-10-21 22:15:00.000')
  })
})
