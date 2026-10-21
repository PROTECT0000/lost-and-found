import { Button } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { MdArrowBack } from 'react-icons/md'

export default function BackButton({ to = '/', label = 'Back to items' }: { to?: string; label?: string }) {
  return (
    <Button component={RouterLink} to={to} startIcon={<MdArrowBack />} sx={{ mb: 2 }}>
      {label}
    </Button>
  )
}
