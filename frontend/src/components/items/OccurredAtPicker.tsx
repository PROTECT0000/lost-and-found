import dayjs, { type Dayjs } from 'dayjs'
import { Stack } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { mergeDate, mergeTime } from '../../utils/dateTime'

interface OccurredAtPickerProps {
  /** e.g. "lost" / "found", used in the field labels. */
  verb: string
  value: string
  error?: string
  onChange: (value: string) => void
}

/** Separate date and time fields bound to a single ISO string ('' when cleared or invalid). */
export default function OccurredAtPicker({ verb, value, error, onChange }: OccurredAtPickerProps) {
  const current = value ? dayjs(value) : null

  const emit = (next: Dayjs | null) => onChange(next?.isValid() ? next.toISOString() : '')

  const handleDateChange = (date: Dayjs | null) => {
    emit(date?.isValid() ? mergeDate(current, date) : null)
  }

  const handleTimeChange = (time: Dayjs | null) => {
    emit(time?.isValid() ? mergeTime(current, time) : null)
  }

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <DatePicker
        label={`Date ${verb}`}
        value={current}
        onChange={handleDateChange}
        disableFuture
        format="DD MMM YYYY"
        slotProps={{
          textField: { fullWidth: true, required: true, error: Boolean(error), helperText: error },
        }}
      />
      <TimePicker
        label={`Time ${verb}`}
        value={current}
        onChange={handleTimeChange}
        ampm={false}
        slotProps={{
          textField: { fullWidth: true, required: true, error: Boolean(error) },
        }}
      />
    </Stack>
  )
}
