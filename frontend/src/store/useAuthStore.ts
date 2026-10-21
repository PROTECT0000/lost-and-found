import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/auth'

interface AuthState {
  token: string | null
  expiresAt: number | null
  login: (password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      expiresAt: null,
      login: async (password) => {
        const { token, expiresAt } = await authApi.login(password)
        set({ token, expiresAt })
      },
      logout: () => set({ token: null, expiresAt: null }),
    }),
    { name: 'lost-and-found-auth' },
  ),
)

export const selectIsAdmin = (state: AuthState) =>
  Boolean(state.token && state.expiresAt && state.expiresAt > Date.now())
