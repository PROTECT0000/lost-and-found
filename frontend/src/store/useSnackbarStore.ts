import { create } from 'zustand'
import type { AlertColor } from '@mui/material'

interface SnackbarState {
  open: boolean
  message: string
  severity: AlertColor
  show: (message: string, severity?: AlertColor) => void
  close: () => void
}

export const useSnackbarStore = create<SnackbarState>((set) => ({
  open: false,
  message: '',
  severity: 'success',
  show: (message, severity = 'success') => set({ open: true, message, severity }),
  close: () => set({ open: false }),
}))
