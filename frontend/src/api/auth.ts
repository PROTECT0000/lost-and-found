import { apiClient } from './client'
import type { LoginResponse } from '../types/admin'

export const authApi = {
  login: (password: string) => apiClient.post<LoginResponse>('/auth/login', { password }).then((r) => r.data),
}
