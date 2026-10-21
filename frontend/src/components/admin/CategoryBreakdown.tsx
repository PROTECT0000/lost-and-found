import { Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material'
import type { AdminStats } from '../../types/admin'
import { categoryLabel } from '../../constants/items'

export default function CategoryBreakdown({ stats }: { stats: AdminStats }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          By category
        </Typography>
        {stats.byCategory.length === 0 && <Typography color="text.secondary">No items yet.</Typography>}
        <Stack spacing={1.5}>
          {stats.byCategory.map(({ category, count }) => (
            <div key={category}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{categoryLabel(category)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {count}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={stats.total ? (count / stats.total) * 100 : 0}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </div>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}
