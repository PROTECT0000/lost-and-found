import { Button } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { MdHome } from 'react-icons/md'
import EmptyState from '../components/common/EmptyState'

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you are looking for does not exist."
      action={
        <Button variant="contained" component={RouterLink} to="/" startIcon={<MdHome />}>
          Go home
        </Button>
      }
    />
  )
}
