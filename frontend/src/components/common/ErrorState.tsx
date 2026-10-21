import { Alert, Button } from '@mui/material'
import { MdRefresh } from 'react-icons/md'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" startIcon={<MdRefresh />} onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {message}
    </Alert>
  )
}
