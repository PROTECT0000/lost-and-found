import type { ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import type { IconType } from 'react-icons'

interface InfoRowProps {
  icon: IconType
  label: string
  value: ReactNode
}

export default function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box sx={{ color: 'primary.main', display: 'flex' }}>
        <Icon size={20} />
      </Box>
      <div>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography>{value}</Typography>
      </div>
    </Stack>
  )
}
