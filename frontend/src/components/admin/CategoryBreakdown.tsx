import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { PieChart } from '@mui/x-charts/PieChart'
import type { AdminStats } from '../../types/admin'
import { CATEGORY_COLORS, ITEM_CATEGORY_OPTIONS } from '../../constants/items'

const SIZE = 180

export default function CategoryBreakdown({ stats }: { stats: AdminStats }) {
  const counts = new Map(stats.byCategory.map(({ category, count }) => [category, count]))
  const total = stats.byCategory.reduce((sum, { count }) => sum + count, 0)
  const slices = ITEM_CATEGORY_OPTIONS.filter((o) => counts.get(o.value)).map((o) => ({
    id: o.value,
    label: o.label,
    value: counts.get(o.value) ?? 0,
    color: CATEGORY_COLORS[o.value],
  }))
  const percent = (value: number) => (total ? `${Math.round((value / total) * 100)}%` : '0%')

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          By category
        </Typography>
        {slices.length === 0 ? (
          <Typography color="text.secondary">No items yet.</Typography>
        ) : (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: 'center' }}>
            <Box sx={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
              <PieChart
                width={SIZE}
                height={SIZE}
                margin={0}
                hideLegend
                series={[
                  {
                    data: slices,
                    innerRadius: '62%',
                    paddingAngle: 1.5,
                    cornerRadius: 3,
                    highlightScope: { fade: 'global', highlight: 'item' },
                    faded: { additionalRadius: -4, color: 'gray' },
                    valueFormatter: ({ value }) => `${value} (${percent(value)})`,
                  },
                ]}
              />
              {/* Total in the donut hole; ignores the pointer so hovering still reaches the slices. */}
              <Stack sx={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
                  {total}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  items
                </Typography>
              </Stack>
            </Box>
            <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0, width: '100%' }}>
              {slices.map((slice) => (
                <Stack component="li" key={slice.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: slice.color, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {slice.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {slice.value}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {percent(slice.value)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
