import { Navigate, Outlet, useLocation } from 'react-router'
import { AppShellSkeleton } from '@/layout/AppShellSkeleton'
import { useAuth } from './useAuth'

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  // Enquanto o /auth/me não responde, o shell aparece em esqueleto. Piscar para o
  // login e voltar seria pior que esperar.
  if (status === 'loading') return <AppShellSkeleton />

  if (status === 'anonymous') {
    return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
