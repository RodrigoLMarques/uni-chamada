import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { AuthContext, type AuthStatus } from './auth-context'
import { fetchCurrentTeacher, login, type Teacher } from './auth.api'
import { discardToken, getToken, storeToken } from './token'

api.setTokenSource(getToken)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? 'loading' : 'anonymous'))

  const forget = useCallback(() => {
    discardToken()
    setTeacher(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  // Não existe refresh token no backend: qualquer 401 encerra a sessão.
  useEffect(() => {
    api.setUnauthorizedHandler(forget)
  }, [forget])

  // Token guardado vale até o servidor dizer o contrário; só o /auth/me confirma.
  useEffect(() => {
    if (!getToken()) return

    const controller = new AbortController()

    fetchCurrentTeacher(api, controller.signal)
      .then((current) => {
        setTeacher(current)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Token recusado, servidor fora ou rede caída: nada disso permite seguir
        // autenticado, e insistir deixaria o shell montado sem dados.
        forget()
      })

    return () => controller.abort()
  }, [forget])

  const signIn = useCallback(async (credentials: { email: string; password: string }) => {
    const result = await login(api, credentials)
    storeToken(result.accessToken)
    setTeacher(result.user)
    setStatus('authenticated')
  }, [])

  const value = useMemo(
    () => ({ status, teacher, signIn, signOut: forget, replaceTeacher: setTeacher }),
    [status, teacher, signIn, forget],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
