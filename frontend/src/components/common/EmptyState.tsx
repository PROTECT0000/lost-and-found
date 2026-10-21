import type { ReactNode } from 'react'
import { Paper, Stack, Typography } from '@mui/material'
import { MdInbox } from 'react-icons/md'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Paper variant="outlined" sx={{ p: 6 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', color: 'text.secondary' }}>
        <MdInbox size={56} />
        <Typography variant="h6" color="text.primary">
          {title}
        </Typography>
        {description && <Typography>{description}</Typography>}
        {action}
      </Stack>
    </Paper>
  )
}
