import { createContext } from 'react'
import type { Teacher } from './auth.api'

export const AUTH_STORAGE_KEY = 'unichamada.token'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export type AuthContextValue = {
  status: AuthStatus
  teacher: Teacher | null
  signIn: (credentials: { email: string; password: string }) => Promise<void>
  signOut: () => void
  /** Usado pela tela de conta depois de um PATCH bem-sucedido. */
  replaceTeacher: (teacher: Teacher) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
