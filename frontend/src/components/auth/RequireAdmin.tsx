import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useIsAdmin } from '../../hooks/useIsAdmin'

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin()
  const location = useLocation()

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  return children
}
