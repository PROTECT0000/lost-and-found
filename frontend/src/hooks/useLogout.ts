import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useSnackbarStore } from '../store/useSnackbarStore'

export function useLogout() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const showSnackbar = useSnackbarStore((s) => s.show)

  return () => {
    logout()
    showSnackbar('Logged out')
    navigate('/')
  }
}
