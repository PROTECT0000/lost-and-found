import type { IconType } from 'react-icons'
import { MdAddCircle, MdAdminPanelSettings, MdHome } from 'react-icons/md'

export interface NavLink {
  label: string
  to: string
  icon: IconType
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Home', to: '/', icon: MdHome },
  { label: 'Report Item', to: '/items/new', icon: MdAddCircle },
  { label: 'Admin', to: '/admin', icon: MdAdminPanelSettings },
]

export const isActiveLink = (to: string, pathname: string) =>
  to === '/' ? pathname === '/' : pathname.startsWith(to)
