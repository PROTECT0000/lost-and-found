import dayjs from 'dayjs'
import type { Item, ItemFilters } from '../types/item'
import { ITEM_STATUS_OPTIONS, ITEM_TYPE_OPTIONS, categoryLabel } from '../constants/items'
import { formatDateTime, parseServerDate } from './format'

// Exports are built entirely in the browser and never include images. The libraries are
// imported on demand so they are only downloaded when someone actually exports.

export type ExportFormat = 'xlsx' | 'pdf'
type ExportFilters = Omit<ItemFilters, 'page' | 'limit'>

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

/** Human-readable summary of the active filters, printed at the top of the export. */
export function describeFilters(filters: ExportFilters): string {
  const parts = [
    filters.type && `Type: ${label(filters.type, ITEM_TYPE_OPTIONS)}`,
    filters.category && `Category: ${categoryLabel(filters.category)}`,
    filters.status && `Status: ${label(filters.status, ITEM_STATUS_OPTIONS)}`,
    filters.q && `Search: "${filters.q}"`,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'All items'
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
  const info = [
    ['Lost & Found items'].map((value) => ({ value, fontWeight: 'bold' as const })),
    ['Filters', describeFilters(filters)],
    ['Items', items.length],
    ['Generated', now.format('DD MMM YYYY, HH:mm')],
  ]
  await writeXlsxFile([
    {
      sheet: 'Items',
      data: [header, ...rows],
      columns: EXPORT_COLUMNS.map((c) => ({ width: c.width })),
      stickyRowsCount: 1,
    },
    { sheet: 'Export info', data: info, columns: [{ width: 12 }, { width: 60 }] },
  ]).toFile(exportFileName('xlsx', now))
}

async function toPdf(items: Item[], filters: ExportFilters, now: dayjs.Dayjs) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const margin = 32

  doc.setFontSize(16)
  doc.text('Lost & Found items', margin, margin + 8)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(
    `${describeFilters(filters)}  ·  ${items.length} item${items.length === 1 ? '' : 's'}  ·  Generated ${now.format('DD MMM YYYY, HH:mm')}`,
    margin,
    margin + 24,
  )

  autoTable(doc, {
    startY: margin + 36,
    margin: { left: margin, right: margin, bottom: margin + 8 },
    head: [EXPORT_COLUMNS.map((c) => c.header)],
    body: items.map((item) => EXPORT_COLUMNS.map((c) => c.text(item))),
    styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
    columnStyles: Object.fromEntries(EXPORT_COLUMNS.map((c, i) => [i, { cellWidth: c.header === 'Description' ? 140 : 'auto' }])),
    didDrawPage: () => {
      const { width, height } = doc.internal.pageSize
      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(`Page ${doc.getNumberOfPages()}`, width - margin, height - margin / 2, { align: 'right' })
    },
  })

  doc.save(exportFileName('pdf', now))
}
