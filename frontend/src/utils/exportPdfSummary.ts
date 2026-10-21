import type { jsPDF } from 'jspdf'
import { STATUS_CHART_COLORS } from '../constants/items'
import type { ExportSummary } from './exportItems'

// Draws the PDF's first page: title, the filters the export used, totals and two charts.
// Everything is vector (jsPDF shapes and text), so it stays sharp when zoomed or printed.
// Imported on demand together with jsPDF.

interface SummaryPage {
  margin: number
  generated: string
  details: { label: string; value: string }[]
  summary: ExportSummary
}

// Text and chrome colors (RGB); data colors come from constants/items.
const INK: [number, number, number] = [33, 33, 33]
const MUTED: [number, number, number] = [110, 110, 110]
const BORDER: [number, number, number] = [221, 221, 221]
const TRACK: [number, number, number] = [240, 240, 240]

const pct = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)}%` : '0%')

export function drawSummaryPage(doc: jsPDF, { margin, generated, details, summary }: SummaryPage) {
  const width = doc.internal.pageSize.getWidth()
  const contentWidth = width - margin * 2
  let y = margin + 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...INK)
  doc.text('Lost & Found items', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(`Generated ${generated}  ·  ${summary.total} item${summary.total === 1 ? '' : 's'}`, margin, y + 16)
  y += 40

  y = drawFilters(doc, details, margin, y, contentWidth)
  y = drawTiles(doc, summary, margin, y + 14, contentWidth)

  const gap = 16
  const panelWidth = (contentWidth - gap) / 2
  const panelHeight = 270
  drawCategoryPanel(doc, summary, margin, y + 14, panelWidth, panelHeight)
  drawTypePanel(doc, summary, margin + panelWidth + gap, y + 14, panelWidth, panelHeight)
}

function panel(doc: jsPDF, x: number, y: number, w: number, h: number, title?: string) {
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.75)
  doc.roundedRect(x, y, w, h, 4, 4, 'S')
  if (title) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...INK)
    doc.text(title, x + 16, y + 22)
  }
}

/** The filters as a label/value grid, three per row. Returns the y below it. */
function drawFilters(doc: jsPDF, details: SummaryPage['details'], x: number, y: number, w: number) {
  const perRow = 3
  const rowHeight = 30
  const rows = Math.ceil(details.length / perRow)
  const height = 30 + rows * rowHeight
  panel(doc, x, y, w, height, 'Filters')
  const colWidth = (w - 32) / perRow
  details.forEach((d, i) => {
    const cx = x + 16 + (i % perRow) * colWidth
    const cy = y + 40 + Math.floor(i / perRow) * rowHeight
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(d.label.toUpperCase(), cx, cy)
    doc.setFontSize(10)
    doc.setTextColor(...INK)
    doc.text(doc.splitTextToSize(d.value, colWidth - 12)[0], cx, cy + 12)
  })
  return y + height
}

/** Five stat tiles in a row. Returns the y below them. */
function drawTiles(doc: jsPDF, s: ExportSummary, x: number, y: number, w: number) {
  const tiles = [
    { label: 'Total items', value: s.total },
    { label: 'Open', value: s.open },
    { label: 'Resolved', value: s.resolved },
    { label: 'Lost', value: s.lost },
    { label: 'Found', value: s.found },
  ]
  const gap = 12
  const tileWidth = (w - gap * (tiles.length - 1)) / tiles.length
  const height = 52
  tiles.forEach((t, i) => {
    const tx = x + i * (tileWidth + gap)
    panel(doc, tx, y, tileWidth, height)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(t.label, tx + 14, y + 18)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...INK)
    doc.text(String(t.value), tx + 14, y + 40)
  })
  return y + height
}

/** Donut of items per category with a legend giving each count and share. */
function drawCategoryPanel(doc: jsPDF, s: ExportSummary, x: number, y: number, w: number, h: number) {
  panel(doc, x, y, w, h, 'By category')
  if (s.total === 0) return emptyNote(doc, x, y, w, h)

  const outer = 82
  const inner = 50
  const cx = x + 16 + outer
  const cy = y + 40 + (h - 40) / 2
  let angle = -Math.PI / 2
  const boundaries: number[] = []
  for (const c of s.byCategory) {
    const sweep = (c.count / s.total) * Math.PI * 2
    fillArc(doc, cx, cy, inner, outer, angle, angle + sweep, c.color)
    angle += sweep
    boundaries.push(angle)
  }
  // A thin white gap between slices, so neighbours stay apart without relying on color.
  if (s.byCategory.length > 1) {
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(2)
    for (const a of boundaries) {
      doc.line(cx + Math.cos(a) * (inner - 1), cy + Math.sin(a) * (inner - 1), cx + Math.cos(a) * (outer + 1), cy + Math.sin(a) * (outer + 1))
    }
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...INK)
  doc.text(String(s.total), cx, cy + 2, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('items', cx, cy + 14, { align: 'center' })

  // Legend: every slice is named with its count, so identity never rests on color alone.
  const lx = cx + outer + 28
  const right = x + w - 16
  const rowHeight = 18
  let ly = cy - ((s.byCategory.length - 1) * rowHeight) / 2
  for (const c of s.byCategory) {
    doc.setFillColor(c.color)
    doc.roundedRect(lx, ly - 7, 8, 8, 1.5, 1.5, 'F')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    doc.text(c.label, lx + 14, ly)
    doc.text(String(c.count), right - 40, ly, { align: 'right' })
    doc.setTextColor(...MUTED)
    doc.text(pct(c.count, s.total), right, ly, { align: 'right' })
    ly += rowHeight
  }
}

/** Horizontal stacked bars: for lost and found, how many are open and resolved. */
function drawTypePanel(doc: jsPDF, s: ExportSummary, x: number, y: number, w: number, h: number) {
  panel(doc, x, y, w, h, 'Lost vs found, by status')
  if (s.total === 0) return emptyNote(doc, x, y, w, h)

  // Legend above the bars.
  let lx = x + 16
  const legendY = y + 44
  for (const status of ['open', 'resolved'] as const) {
    doc.setFillColor(STATUS_CHART_COLORS[status])
    doc.roundedRect(lx, legendY - 7, 8, 8, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    const text = status === 'open' ? 'Open' : 'Resolved'
    doc.text(text, lx + 13, legendY)
    lx += 13 + doc.getTextWidth(text) + 18
  }

  const labelWidth = 52
  const totalWidth = 44
  const trackX = x + 16 + labelWidth
  const trackWidth = w - 32 - labelWidth - totalWidth
  const max = Math.max(1, ...s.byType.map((t) => t.open + t.resolved))
  const barHeight = 26
  let by = y + 82
  for (const t of s.byType) {
    const total = t.open + t.resolved
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...INK)
    doc.text(t.label, x + 16, by + barHeight / 2 + 3.5)

    doc.setFillColor(...TRACK)
    doc.roundedRect(trackX, by, trackWidth, barHeight, 3, 3, 'F')
    const openWidth = (t.open / max) * trackWidth
    const resolvedWidth = (t.resolved / max) * trackWidth
    if (openWidth > 0) {
      doc.setFillColor(STATUS_CHART_COLORS.open)
      doc.roundedRect(trackX, by, openWidth, barHeight, 3, 3, 'F')
    }
    if (resolvedWidth > 0) {
      doc.setFillColor(STATUS_CHART_COLORS.resolved)
      doc.roundedRect(trackX + openWidth, by, resolvedWidth, barHeight, 3, 3, 'F')
      if (openWidth > 0) {
        // 2pt white gap where the segments meet.
        doc.setFillColor(255, 255, 255)
        doc.rect(trackX + openWidth - 1, by, 2, barHeight, 'F')
      }
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(String(total), x + w - 16, by + barHeight / 2 + 3.5, { align: 'right' })

    // Values are written out under each bar rather than inside the colored segments.
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text(
      `${t.open} open (${pct(t.open, total)})  ·  ${t.resolved} resolved (${pct(t.resolved, total)})`,
      trackX,
      by + barHeight + 13,
    )
    by += barHeight + 40
  }

  // Overall resolution rate as a headline number under the bars.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...INK)
  doc.text(pct(s.resolved, s.total), x + 16, y + h - 34)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(`resolved overall (${s.resolved} of ${s.total})`, x + 16, y + h - 18)
}

function emptyNote(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text('No items match these filters.', x + w / 2, y + h / 2, { align: 'center' })
}

/** Fills a ring segment from angle a0 to a1 (radians, clockwise from the x axis). */
function fillArc(doc: jsPDF, cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, color: string) {
  const steps = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 120))
  const points: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    points.push([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1])
  }
  for (let i = steps; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / steps
    points.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0])
  }
  // jsPDF's lines() takes segments relative to the previous point.
  const segments = points.slice(1).map(([px, py], i) => [px - points[i][0], py - points[i][1]])
  doc.setFillColor(color)
  doc.lines(segments, points[0][0], points[0][1], [1, 1], 'F', true)
}
