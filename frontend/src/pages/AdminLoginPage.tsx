import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MdAdminPanelSettings, MdLogin } from 'react-icons/md'
import { useAuthStore } from '../store/useAuthStore'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { getErrorMessage } from '../api/client'
import PasswordField from '../components/auth/PasswordField'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'
  const isAdmin = useIsAdmin()
  const login = useAuthStore((s) => s.login)

  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isAdmin) return <Navigate to={from} replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: { xs: 2, sm: 8 } }}>
      <Paper variant="outlined" component="form" onSubmit={handleSubmit} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Box sx={{ color: 'primary.main', display: 'flex' }}>
            <MdAdminPanelSettings size={56} />
          </Box>
          <Typography variant="h5" align="center" sx={{ fontWeight: 700 }}>
            Admin login
          </Typography>
          {error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}
          <PasswordField
            fullWidth
            autoFocus
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            startIcon={<MdLogin />}
            loading={submitting}
            disabled={!password}
          >
            Log in
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
