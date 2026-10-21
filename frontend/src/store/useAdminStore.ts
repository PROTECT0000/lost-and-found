import { create } from 'zustand'
import { adminApi } from '../api/admin'
import { getErrorMessage } from '../api/client'
import type { AdminStats } from '../types/admin'

interface AdminState {
  stats: AdminStats | null
  loading: boolean
  error: string | null
  fetchStats: () => Promise<void>
}

export const useAdminStore = create<AdminState>((set) => ({
  stats: null,
  loading: false,
  error: null,
  fetchStats: async () => {
    set({ loading: true, error: null })
    try {
      set({ stats: await adminApi.stats(), loading: false })
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false })
    }
  },
}))
