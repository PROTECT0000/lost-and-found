import type { ReactNode } from 'react'
import { Stack, Typography } from '@mui/material'

interface PageHeaderProps {
  title: string
  action?: ReactNode
}

export default function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ mb: 3, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
    >
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {action}
    </Stack>
  )
}
