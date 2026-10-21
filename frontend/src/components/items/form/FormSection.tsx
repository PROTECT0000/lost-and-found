import type { ReactNode } from 'react'
import { Stack, Typography } from '@mui/material'

interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export default function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <Stack spacing={2.5}>
      <div>
        <Typography variant="h6">{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </div>
      {children}
    </Stack>
  )
}
