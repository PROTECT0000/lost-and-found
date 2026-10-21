import { apiClient } from './client'
import type { AdminStats } from '../types/admin'

export const adminApi = {
  stats: () => apiClient.get<AdminStats>('/admin/stats').then((r) => r.data),
}
