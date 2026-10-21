import dayjs from 'dayjs'
import type { Item, ItemCategory, ItemFilters, SortField } from '../types/item'
import {
  CATEGORY_COLORS,
  ITEM_CATEGORY_OPTIONS,
  ITEM_STATUS_OPTIONS,
  ITEM_TYPE_OPTIONS,
  categoryLabel,
} from '../constants/items'
import { formatDateTime, parseServerDate } from './format'
import { activeSort } from './itemQuery'

// Exports are built entirely in the browser and never include images. The libraries are
// imported on demand so they are only downloaded when someone actually exports.

export type ExportFormat = 'xlsx' | 'pdf'
export type ExportFilters = Omit<ItemFilters, 'page' | 'limit'>

const label = <T extends string>(value: T, options: { value: T; label: string }[]) =>
  options.find((o) => o.value === value)?.label ?? value

interface ExportColumn {
  header: string
  /** Excel column width in characters. */
  width: number
  text: (item: Item) => string
  /** Timestamp columns are written as real dates in Excel, so they sort and filter. */
  date?: (item: Item) => string
}

export const EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Title', width: 30, text: (i) => i.title },
  { header: 'Type', width: 8, text: (i) => label(i.type, ITEM_TYPE_OPTIONS) },
  { header: 'Category', width: 13, text: (i) => categoryLabel(i.category) },
  { header: 'Status', width: 10, text: (i) => label(i.status, ITEM_STATUS_OPTIONS) },
  { header: 'Location', width: 24, text: (i) => i.location },
  { header: 'Lost / found on', width: 18, text: (i) => formatDateTime(i.occurred_at), date: (i) => i.occurred_at },
  { header: 'Description', width: 40, text: (i) => i.description },
  { header: 'Contact name', width: 20, text: (i) => i.contact_name },
  { header: 'Contact info', width: 26, text: (i) => i.contact_info },
  { header: 'Reported', width: 18, text: (i) => formatDateTime(i.created_at), date: (i) => i.created_at },
]

const SORT_LABELS: Record<SortField, string> = {
  created_at: 'Reported',
  occurred_at: 'Lost / found on',
  title: 'Title',
  type: 'Type',
  category: 'Category',
  location: 'Location',
  status: 'Status',
}

/** The reported date range as dates; `to` is exclusive, so the last day shown is the day before. */
export function describeReported(filters: Pick<ExportFilters, 'from' | 'to'>): string | undefined {
  const from = filters.from && dayjs(filters.from).format('DD MMM YYYY')
  const to = filters.to && dayjs(filters.to).subtract(1, 'millisecond').format('DD MMM YYYY')
  if (from && to) return from === to ? from : `${from} – ${to}`
  if (from) return `From ${from}`
  if (to) return `Until ${to}`
  return undefined
}

/** Every filter of an export with its value ("All" when not set), for the export's header. */
export function filterDetails(filters: ExportFilters): { label: string; value: string }[] {
  const sort = activeSort({ ...filters, page: 1, limit: 1 })
  return [
    { label: 'Type', value: filters.type ? label(filters.type, ITEM_TYPE_OPTIONS) : 'All' },
    { label: 'Category', value: filters.category ? categoryLabel(filters.category) : 'All' },
    { label: 'Status', value: filters.status ? label(filters.status, ITEM_STATUS_OPTIONS) : 'All' },
    { label: 'Search', value: filters.q ? `"${filters.q}"` : 'None' },
    { label: 'Reported', value: describeReported(filters) ?? 'Any date' },
    { label: 'Sorted by', value: `${SORT_LABELS[sort.field]}, ${sort.order === 'asc' ? 'ascending' : 'descending'}` },
  ]
}

export interface ExportSummary {
  total: number
  open: number
  resolved: number
  lost: number
  found: number
  /** Categories with at least one item, in the fixed category order. */
  byCategory: { category: ItemCategory; label: string; count: number; color: string }[]
  /** Open and resolved counts for each type. */
  byType: { type: 'lost' | 'found'; label: string; open: number; resolved: number }[]
}

/** Totals for the exported items, so the summary always matches the rows. */
export function summarizeItems(items: Item[]): ExportSummary {
  const count = (pred: (i: Item) => boolean) => items.filter(pred).length
  return {
    total: items.length,
    open: count((i) => i.status === 'open'),
    resolved: count((i) => i.status === 'resolved'),
    lost: count((i) => i.type === 'lost'),
    found: count((i) => i.type === 'found'),
    byCategory: ITEM_CATEGORY_OPTIONS.map((o) => ({
      category: o.value,
      label: o.label,
      count: count((i) => i.category === o.value),
      color: CATEGORY_COLORS[o.value],
    })).filter((c) => c.count > 0),
    byType: ITEM_TYPE_OPTIONS.map((o) => ({
      type: o.value,
      label: o.label,
      open: count((i) => i.type === o.value && i.status === 'open'),
      resolved: count((i) => i.type === o.value && i.status === 'resolved'),
    })),
  }
}

export const exportFileName = (format: ExportFormat, now = dayjs()) =>
  `lost-and-found-items-${now.format('YYYY-MM-DD-HHmm')}.${format}`

/**
 * Excel stores dates without a timezone, and write-excel-file writes a Date's UTC fields.
 * Shift by the local offset so the sheet shows the same local time as the app.
 */
export function toExcelLocalDate(value: string): Date {
  const local = parseServerDate(value)
  return new Date(local.valueOf() + local.utcOffset() * 60_000)
}

export async function exportItems(format: ExportFormat, items: Item[], filters: ExportFilters) {
  const now = dayjs()
  if (format === 'xlsx') await toExcel(items, filters, now)
  else await toPdf(items, filters, now)
}

async function toExcel(items: Item[], filters: ExportFilters, now: dayjs.Dayjs) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const header = EXPORT_COLUMNS.map((c) => ({ value: c.header, fontWeight: 'bold' as const }))
  const rows = items.map((item) =>
    EXPORT_COLUMNS.map((c) =>
      c.date
        ? { value: toExcelLocalDate(c.date(item)), type: Date, format: 'dd mmm yyyy, hh:mm' }
        : { value: c.text(item), type: String, wrap: c.header === 'Description' },
    ),
  )
  const summary = summarizeItems(items)
  const bold = (value: string) => ({ value, fontWeight: 'bold' as const })
  const info = [
    [bold('Lost & Found items')],
    ['Generated', now.format('DD MMM YYYY, HH:mm')],
    [],
    [bold('Filters')],
    ...filterDetails(filters).map((d) => [d.label, d.value]),
    [],
    [bold('Summary')],
    ['Items', summary.total],
    ['Open', summary.open],
    ['Resolved', summary.resolved],
    ['Lost', summary.lost],
    ['Found', summary.found],
    [],
    [bold('By category')],
    ...summary.byCategory.map((c) => [c.label, c.count]),
  ]
  await writeXlsxFile([
    {
      sheet: 'Items',
      data: [header, ...rows],
      columns: EXPORT_COLUMNS.map((c) => ({ width: c.width })),
      stickyRowsCount: 1,
    },
    { sheet: 'Summary', data: info, columns: [{ width: 14 }, { width: 50 }] },
  ]).toFile(exportFileName('xlsx', now))
}

async function toPdf(items: Item[], filters: ExportFilters, now: dayjs.Dayjs) {
  const [{ jsPDF }, { autoTable }, { drawSummaryPage }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('./exportPdfSummary'),
  ])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const margin = 32

  // Page 1: what was exported (filters) and charts of it; the item table starts on page 2.
  drawSummaryPage(doc, {
    margin,
    generated: now.format('DD MMM YYYY, HH:mm'),
    details: filterDetails(filters),
    summary: summarizeItems(items),
  })

  if (items.length > 0) {
    doc.addPage()
    autoTable(doc, {
      startY: margin,
      margin: { top: margin, left: margin, right: margin, bottom: margin + 8 },
      head: [EXPORT_COLUMNS.map((c) => c.header)],
      body: items.map((item) => EXPORT_COLUMNS.map((c) => c.text(item))),
      styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
      columnStyles: Object.fromEntries(
        EXPORT_COLUMNS.map((c, i) => [i, { cellWidth: c.header === 'Description' ? 140 : 'auto' }]),
      ),
    })
  }

  const pages = doc.getNumberOfPages()
  const { width, height } = doc.internal.pageSize
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text('Lost & Found items', margin, height - margin / 2)
    doc.text(`Page ${page} of ${pages}`, width - margin, height - margin / 2, { align: 'right' })
  }

  doc.save(exportFileName('pdf', now))
}
