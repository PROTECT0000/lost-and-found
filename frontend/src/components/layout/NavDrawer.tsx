import { Box, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material'
import { NavLink as RouterLink, useLocation } from 'react-router-dom'
import { MdLogout } from 'react-icons/md'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { useLogout } from '../../hooks/useLogout'
import { NAV_LINKS, isActiveLink } from './navLinks'

interface NavDrawerProps {
  open: boolean
  onClose: () => void
}

export default function NavDrawer({ open, onClose }: NavDrawerProps) {
  const { pathname } = useLocation()
  const isAdmin = useIsAdmin()
  const logout = useLogout()

  return (
    <Drawer open={open} onClose={onClose}>
      <Box sx={{ width: 260 }} role="presentation" onClick={onClose}>
        <Toolbar>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
            Lost &amp; Found
          </Typography>
        </Toolbar>
        <List>
          {NAV_LINKS.map(({ label, to, icon: Icon }) => (
            <ListItemButton key={to} component={RouterLink} to={to} selected={isActiveLink(to, pathname)}>
              <ListItemIcon>
                <Icon size={22} />
              </ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          ))}
        </List>
        {isAdmin && (
          <>
            <Divider />
            <List>
              <ListItemButton onClick={logout}>
                <ListItemIcon>
                  <MdLogout size={22} />
                </ListItemIcon>
                <ListItemText primary="Log out" />
              </ListItemButton>
            </List>
          </>
        )}
      </Box>
    </Drawer>
  )
}
