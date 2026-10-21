import { Card, CardContent, Grid, Skeleton } from '@mui/material'

interface LoadingStateProps {
  count?: number
}

export default function LoadingState({ count = 6 }: LoadingStateProps) {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: count }, (_, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <Skeleton variant="rectangular" height={160} />
            <CardContent>
              <Skeleton width="60%" height={32} />
              <Skeleton width="90%" />
              <Skeleton width="40%" />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}
