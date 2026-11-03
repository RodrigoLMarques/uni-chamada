import { Modal } from './Modal'

export function ConfirmModal({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Voltar',
  tone = 'danger',
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string
  description: string
  /** Repete o verbo da ação, nunca "OK" nem "Sim". */
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      title={title}
      description={description}
      tone={tone}
      busy={busy}
      onClose={onClose}
      actions={
        <>
          <button className="uc-btn uc-btn-secondary" type="button" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={tone === 'danger' ? 'uc-btn uc-btn-destructive' : 'uc-btn uc-btn-primary'}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? <span className="uc-spinner" aria-hidden="true" /> : null}
            {confirmLabel}
          </button>
        </>
      }
    />
  )
}
