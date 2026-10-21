import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import RequireAdmin from './components/auth/RequireAdmin'
import HomePage from './pages/HomePage'
import ItemDetailPage from './pages/ItemDetailPage'
import CreateItemPage from './pages/CreateItemPage'
import EditItemPage from './pages/EditItemPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import NotFoundPage from './pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/items/new', element: <CreateItemPage /> },
      { path: '/items/:id', element: <ItemDetailPage /> },
      {
        path: '/items/:id/edit',
        element: (
          <RequireAdmin>
            <EditItemPage />
          </RequireAdmin>
        ),
      },
      { path: '/admin/login', element: <AdminLoginPage /> },
      {
        path: '/admin',
        element: (
          <RequireAdmin>
            <AdminDashboardPage />
          </RequireAdmin>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
