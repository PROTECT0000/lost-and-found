import { apiClient } from './client'
import { useAuthStore } from '../store/useAuthStore'
import { useSnackbarStore } from '../store/useSnackbarStore'

/** Attach the admin token to requests and log out when the server rejects it. */
export function setupInterceptors() {
  apiClient.interceptors.request.use((config) => {
    const { token } = useAuthStore.getState()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  apiClient.interceptors.response.use(undefined, (error) => {
    const { token, logout } = useAuthStore.getState()
    if (error.response?.status === 401 && token) {
      logout()
      useSnackbarStore.getState().show('Your admin session has expired. Please log in again.', 'warning')
    }
    return Promise.reject(error)
  })
}
