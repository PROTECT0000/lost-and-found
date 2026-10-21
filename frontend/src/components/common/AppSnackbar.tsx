import { Alert, Snackbar } from '@mui/material'
import { useSnackbarStore } from '../../store/useSnackbarStore'

export default function AppSnackbar() {
  const { open, message, severity, close } = useSnackbarStore()

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={close} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  )
}
