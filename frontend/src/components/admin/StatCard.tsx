import { Box, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material'
import type { IconType } from 'react-icons'

interface StatCardProps {
  label: string
  value: number | undefined
  icon: IconType
  color: 'primary' | 'success' | 'warning' | 'info' | 'secondary'
}

export default function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${color}.main`,
              color: `${color}.contrastText`,
              flexShrink: 0,
            }}
          >
            <Icon size={26} />
          </Box>
          <div>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {value ?? <Skeleton width={40} />}
            </Typography>
          </div>
        </Stack>
      </CardContent>
    </Card>
  )
}
