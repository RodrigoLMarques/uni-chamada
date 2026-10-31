import { createContext } from 'react'

export type ToastTone = 'success' | 'warning' | 'danger'

export type Toast = {
  id: number
  tone: ToastTone
  title: string
  body?: string
}

export type ToastContextValue = {
  /** Sucesso some sozinho em 5 s; aviso e erro ficam até o professor fechar. */
  notify: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
