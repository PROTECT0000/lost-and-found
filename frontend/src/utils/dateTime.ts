import dayjs, { type Dayjs } from 'dayjs'

/** Keep the time of `current` (or now, when empty) and take the calendar day from `date`. */
export function mergeDate(current: Dayjs | null, date: Dayjs, now: Dayjs = dayjs()): Dayjs {
  const base = current ?? now.second(0).millisecond(0)
  // Start from `date` and copy the time over, rather than setting year/month/day one by one,
  // so month-length edge cases (Jan 31 -> Feb) never depend on intermediate dates.
  return date.hour(base.hour()).minute(base.minute()).second(base.second()).millisecond(base.millisecond())
}

/** Keep the day of `current` (or today, when empty) and take hours/minutes from `time`. */
export function mergeTime(current: Dayjs | null, time: Dayjs, now: Dayjs = dayjs()): Dayjs {
  const base = current ?? now
  return base.hour(time.hour()).minute(time.minute()).second(0).millisecond(0)
}
