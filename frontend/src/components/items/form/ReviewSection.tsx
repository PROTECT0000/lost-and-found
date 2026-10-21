import type { ReactNode } from 'react'
import { Button, Stack, Typography } from '@mui/material'
import { MdEdit } from 'react-icons/md'

interface ReviewSectionProps {
  title: string
  onEdit: () => void
  children: ReactNode
}

export default function ReviewSection({ title, onEdit, children }: ReviewSectionProps) {
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Button size="small" startIcon={<MdEdit />} onClick={onEdit}>
          Edit
        </Button>
      </Stack>
      {children}
    </Stack>
  )
}
