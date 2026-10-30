import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type Toast, type ToastTone } from './toast-context'

const SUCCESS_DISMISS_MS = 5000
const MAX_STACKED = 3

const ICON_BY_TONE: Record<ToastTone, string> = {
  success: 'uc-i-circle-check',
  warning: 'uc-i-triangle-alert',
  danger: 'uc-i-circle-x',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextId.current++
      setToasts((current) => [...current, { ...toast, id }].slice(-MAX_STACKED))
      if (toast.tone === 'success') {
        window.setTimeout(() => dismiss(id), SUCCESS_DISMISS_MS)
      }
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <ToastContext value={value}>
      {children}
      <div className="uc-toasts">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`uc-toast uc-toast-${toast.tone}`}
            role={toast.tone === 'danger' ? 'alert' : 'status'}
          >
            <span className={`uc-icon ${ICON_BY_TONE[toast.tone]}`} aria-hidden="true" />
            <div>
              <p className="uc-toast-title">{toast.title}</p>
              {toast.body ? <p className="uc-toast-body">{toast.body}</p> : null}
            </div>
            <button
              className="uc-btn uc-btn-ghost uc-btn-sm uc-btn-icon"
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Fechar"
            >
              <span className="uc-icon uc-i-x" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
