import { useEffect, useRef, useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import type { DateValidationError } from '@mui/x-date-pickers/models'
import { MdPictureAsPdf, MdTableChart } from 'react-icons/md'
import { itemsApi } from '../../api/items'
import { getErrorMessage } from '../../api/client'
import { ITEM_CATEGORY_OPTIONS, ITEM_STATUS_OPTIONS } from '../../constants/items'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { ExportFilters, ExportFormat } from '../../utils/exportItems'
import SelectField from '../common/SelectField'
import ItemTypeToggle from '../items/ItemTypeToggle'

/** A picker validation error, or 'partial' when only some of the day/month/year are typed. */
type DateFieldError = DateValidationError | 'partial'

function dateErrorMessage(reason: DateFieldError): string | undefined {
  switch (reason) {
    case null:
      return undefined
    case 'partial':
    case 'invalidDate':
      return 'Enter a complete date'
    case 'minDate':
      return 'Must be on or after the start date'
    case 'maxDate':
      return 'Must be on or before the end date'
    default:
      return 'Invalid date'
  }
}

interface ExportDialogProps {
  open: boolean
  /** Starting filters, normally what the dashboard currently shows. */
  initialFilters: ExportFilters
  exporting?: boolean
  onExport: (format: ExportFormat, filters: ExportFilters) => void
  onClose: () => void
}

/** Choose the format and narrow down which items to export. */
export default function ExportDialog({ open, initialFilters, exporting = false, onExport, onClose }: ExportDialogProps) {
  return (
    <Dialog open={open} onClose={exporting ? undefined : onClose} maxWidth="sm" fullWidth>
      {/* Mounted only while open, so each opening starts from the dashboard's current filters. */}
      {open && <ExportForm initialFilters={initialFilters} exporting={exporting} onExport={onExport} onClose={onClose} />}
    </Dialog>
  )
}

function ExportForm({ initialFilters, exporting, onExport, onClose }: Omit<ExportDialogProps, 'open'>) {
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [filters, setFilters] = useState<ExportFilters>(initialFilters)
  const [fromDate, setFromDate] = useState<Dayjs | null>(null)
  const [toDate, setToDate] = useState<Dayjs | null>(null)
  const set = (change: Partial<ExportFilters>) => setFilters((f) => ({ ...f, ...change }))

  // The pickers report half-typed or out-of-range dates through onError while their value stays
  // null; those must block the export, or it would silently include every date.
  const [fromReason, setFromReason] = useState<DateFieldError>(null)
  const [toReason, setToReason] = useState<DateFieldError>(null)
  const fromError = dateErrorMessage(fromReason)
  const toError = dateErrorMessage(toReason)
  const rangeError = fromError ?? toError
  // Whole local days: from the start of the first day up to (not including) the day after the last.
  const exportFilters: ExportFilters = {
    ...filters,
    q: filters.q?.trim() || undefined,
    from: fromDate?.isValid() ? fromDate.startOf('day').toISOString() : undefined,
    to: toDate?.isValid() ? toDate.add(1, 'day').startOf('day').toISOString() : undefined,
  }

  // Live count of matching items, so nobody exports an empty file by accident.
  const query = useDebouncedValue(JSON.stringify(exportFilters), 300)
  const [count, setCount] = useState<{ query: string; total?: number; error?: string } | null>(null)
  useEffect(() => {
    if (rangeError) return
    let cancelled = false
    itemsApi
      .list({ ...JSON.parse(query), page: 1, limit: 1 })
      .then(({ meta }) => !cancelled && setCount({ query, total: meta.total }))
      .catch((err) => !cancelled && setCount({ query, error: getErrorMessage(err) }))
    return () => {
      cancelled = true
    }
  }, [query, rangeError])
  const counting = !count || count.query !== JSON.stringify(exportFilters)
  const total = counting ? undefined : count.total

  return (
    <>
      <DialogTitle>Export items</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <div>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.75 }}>
              Format
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              color="primary"
              size="small"
              value={format}
              onChange={(_, next: ExportFormat | null) => next && setFormat(next)}
            >
              <ToggleButton value="pdf" sx={{ gap: 0.75 }}>
                <MdPictureAsPdf size={18} /> PDF with summary &amp; charts
              </ToggleButton>
              <ToggleButton value="xlsx" sx={{ gap: 0.75 }}>
                <MdTableChart size={18} /> Excel (.xlsx)
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          <ItemTypeToggle includeAll fullWidth value={filters.type ?? ''} onChange={(type) => set({ type: type || undefined })} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <SelectField
              fullWidth
              size="small"
              label="Category"
              allLabel="All categories"
              options={ITEM_CATEGORY_OPTIONS}
              value={filters.category ?? ''}
              onChange={(category) => set({ category: category || undefined })}
            />
            <SelectField
              fullWidth
              size="small"
              label="Status"
              allLabel="All statuses"
              options={ITEM_STATUS_OPTIONS}
              value={filters.status ?? ''}
              onChange={(status) => set({ status: status || undefined })}
            />
          </Stack>
          <TextField
            size="small"
            label="Search"
            placeholder="Title, description or location"
            value={filters.q ?? ''}
            onChange={(e) => set({ q: e.target.value })}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <DateRangeField
              label="Reported from"
              value={fromDate}
              error={fromError}
              onChange={setFromDate}
              onError={setFromReason}
              maxDate={toDate?.isValid() ? toDate : dayjs()}
            />
            <DateRangeField
              label="Reported to"
              value={toDate}
              error={toError}
              onChange={setToDate}
              onError={setToReason}
              minDate={fromDate?.isValid() ? fromDate : undefined}
              maxDate={dayjs()}
            />
          </Stack>

          {count?.error && !counting ? (
            <Alert severity="error">{count.error}</Alert>
          ) : (
            <Alert severity={total === 0 ? 'warning' : 'info'}>
              {rangeError
                ? 'Fix the date range to see how many items match.'
                : counting
                  ? 'Counting matching items…'
                  : total === 0
                    ? 'No items match these filters.'
                    : `${total} item${total === 1 ? '' : 's'} will be exported.`}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={exporting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          loading={exporting}
          disabled={Boolean(rangeError) || counting || !total}
          onClick={() => onExport(format, exportFilters)}
        >
          Export{total ? ` ${total}` : ''}
        </Button>
      </DialogActions>
    </>
  )
}

interface DateRangeFieldProps {
  label: string
  value: Dayjs | null
  error?: string
  minDate?: Dayjs
  maxDate?: Dayjs
  onChange: (value: Dayjs | null) => void
  onError: (reason: DateFieldError) => void
}

/**
 * A date picker that also reports half-typed input. MUI keeps the value null until every part of
 * the date is typed and raises no error for it, so the visible text is checked after each key.
 */
function DateRangeField({ label, value, error, minDate, maxDate, onChange, onError }: DateRangeFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pickerError, setPickerError] = useState<DateValidationError>(null)
  const [partial, setPartial] = useState(false)

  const report = (nextPicker: DateValidationError, nextPartial: boolean) => {
    setPickerError(nextPicker)
    setPartial(nextPartial)
    onError(nextPicker ?? (nextPartial ? 'partial' : null))
  }
  // Typed sections show digits or month names; empty ones show the D/M/Y placeholders.
  const checkText = () => {
    const text = inputRef.current?.value ?? ''
    report(pickerError, text !== '' && /[0-9]/.test(text) && !value?.isValid())
  }

  return (
    <Box onKeyUpCapture={checkText} sx={{ flex: 1 }}>
      <DatePicker
        label={label}
        value={value}
        onChange={(next) => {
          onChange(next)
          // A complete date (or clearing the field) ends any half-typed state.
          report(pickerError, next === null ? false : !next.isValid())
        }}
        onError={(reason) => report(reason, partial)}
        minDate={minDate}
        maxDate={maxDate}
        format="DD MMM YYYY"
        inputRef={inputRef}
        slotProps={{
          textField: { size: 'small', fullWidth: true, error: Boolean(error), helperText: error },
          field: { clearable: true },
        }}
      />
    </Box>
  )
}
