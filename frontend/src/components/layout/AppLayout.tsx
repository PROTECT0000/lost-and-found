import { Box, Container } from '@mui/material'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import AppSnackbar from '../common/AppSnackbar'

export default function AppLayout() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
      <AppSnackbar />
    </Box>
  )
}
