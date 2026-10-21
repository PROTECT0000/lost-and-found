import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: { main: '#1565c0', light: '#5e92f3', dark: '#003c8f', contrastText: '#ffffff' },
    secondary: { main: '#42a5f5', contrastText: '#ffffff' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
})
