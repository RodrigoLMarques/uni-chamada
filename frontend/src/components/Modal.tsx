import { useEffect, useId, useRef, type ReactNode } from 'react'

export function Modal({
  title,
  description,
  tone = 'default',
  busy = false,
  onClose,
  children,
  actions,
}: {
  title: string
  description?: string
  tone?: 'default' | 'danger'
  /** Durante um envio, Esc e clique no véu não fecham: fechar no meio deixaria o
   *  professor sem saber se a ação aconteceu. */
  busy?: boolean
  onClose: () => void
  children?: ReactNode
  actions: ReactNode
}) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus()
    return () => previouslyFocused?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onClose])

  return (
    <div
      className="uc-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={tone === 'danger' ? 'uc-modal uc-modal-danger' : 'uc-modal'}
        role={tone === 'danger' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="uc-modal-head">
          <div>
            <h2 className="uc-modal-title" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="uc-modal-body" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {children}
        <div className="uc-modal-actions">{actions}</div>
      </div>
    </div>
  )
}
