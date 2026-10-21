import { lazy, Suspense } from 'react'
import { Grid, Skeleton } from '@mui/material'
import { MdCheckCircle, MdInventory2, MdReportProblem, MdSchedule, MdVolunteerActivism } from 'react-icons/md'
import type { AdminStats } from '../../types/admin'
import StatCard from './StatCard'

// The chart library is only needed here, so it is downloaded with the dashboard, not the public pages.
const CategoryBreakdown = lazy(() => import('./CategoryBreakdown'))

export default function StatsOverview({ stats }: { stats: AdminStats | null }) {
  const cards = [
    { label: 'Total items', value: stats?.total, icon: MdInventory2, color: 'primary' },
    { label: 'Open', value: stats?.open, icon: MdSchedule, color: 'info' },
    { label: 'Resolved', value: stats?.resolved, icon: MdCheckCircle, color: 'success' },
    { label: 'Lost', value: stats?.lost, icon: MdReportProblem, color: 'warning' },
    { label: 'Found', value: stats?.found, icon: MdVolunteerActivism, color: 'secondary' },
  ] as const

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Grid container spacing={2}>
          {cards.map((card) => (
            <Grid key={card.label} size={{ xs: 12, sm: 6 }}>
              <StatCard {...card} />
            </Grid>
          ))}
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        {stats && (
          <Suspense fallback={<Skeleton variant="rounded" height="100%" sx={{ minHeight: 240 }} />}>
            <CategoryBreakdown stats={stats} />
          </Suspense>
        )}
      </Grid>
    </Grid>
  )
}
