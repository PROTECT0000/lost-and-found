import { useState } from 'react'
import { AppBar, Box, Button, Container, IconButton, Toolbar, Typography } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { MdLogout, MdMenu, MdTravelExplore } from 'react-icons/md'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { useLogout } from '../../hooks/useLogout'
import { NAV_LINKS, isActiveLink } from './navLinks'
import NavDrawer from './NavDrawer'

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()
  const isAdmin = useIsAdmin()
  const logout = useLogout()

  return (
    <>
      <AppBar position="sticky" color="primary">
        <Container maxWidth="lg">
          <Toolbar disableGutters>
            <IconButton
              color="inherit"
              edge="start"
              aria-label="Open navigation"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 1, display: { md: 'none' } }}
            >
              <MdMenu />
            </IconButton>
            <Box
              component={RouterLink}
              to="/"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'inherit', textDecoration: 'none', flexGrow: 1 }}
            >
              <MdTravelExplore size={28} />
              <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                Lost &amp; Found
              </Typography>
            </Box>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              {NAV_LINKS.map(({ label, to, icon: Icon }) => (
                <Button
                  key={to}
                  component={RouterLink}
                  to={to}
                  color="inherit"
                  startIcon={<Icon />}
                  sx={{ bgcolor: isActiveLink(to, pathname) ? 'primary.dark' : 'transparent' }}
                >
                  {label}
                </Button>
              ))}
              {isAdmin && (
                <Button color="inherit" startIcon={<MdLogout />} onClick={logout}>
                  Log out
                </Button>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
