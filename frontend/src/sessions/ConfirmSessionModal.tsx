import { Modal } from '@/components/Modal'
import { useToast } from '@/components/useToast'
import type { RollSummary } from './live.api'
import { useConfirmSession } from './manual.api'

export function ConfirmSessionModal({
  courseId,
  sessionId,
  courseName,
  sessionDate,
  summary,
  flaggedCount,
  onClose,
  onConfirmed,
}: {
  courseId: string
  sessionId: string
  courseName: string
  sessionDate: string
  summary: RollSummary
  flaggedCount: number
  onClose: () => void
  onConfirmed: () => void
}) {
  const { notify } = useToast()
  const confirm = useConfirmSession(courseId, sessionId)

  async function onConfirm() {
    try {
      await confirm.mutateAsync()
      notify({
        tone: 'success',
        title: 'Chamada confirmada',
        body: `${summary.present} presenças entraram na frequência de ${courseName}.`,
      })
      onConfirmed()
    } catch {
      notify({ tone: 'danger', title: 'Não foi possível confirmar a chamada' })
    }
  }

  return (
    <Modal
      title={`Confirmar chamada de ${sessionDate}?`}
      tone="danger"
      busy={confirm.isPending}
      onClose={onClose}
      actions={
        <>
          <button
            className="uc-btn uc-btn-secondary"
            type="button"
            onClick={onClose}
            disabled={confirm.isPending}
          >
            Voltar
          </button>
          <button
            className="uc-btn uc-btn-primary"
            type="button"
            onClick={() => void onConfirm()}
            disabled={confirm.isPending}
            aria-busy={confirm.isPending}
          >
            {confirm.isPending ? <span className="uc-spinner" aria-hidden="true" /> : null}
            Confirmar chamada
          </button>
        </>
      }
    >
      <p className="uc-modal-body">
        {summary.present} {summary.present === 1 ? 'presença' : 'presenças'} de {summary.enrolled}{' '}
        {summary.enrolled === 1 ? 'matriculado' : 'matriculados'} entram na frequência de{' '}
        {courseName}, e {summary.absent} {summary.absent === 1 ? 'aluno fica' : 'alunos ficam'} com
        falta.
        {flaggedCount > 0
          ? ` ${flaggedCount === 1 ? 'O registro com aviso conta' : `Os ${flaggedCount} registros com aviso contam`} como presença.`
          : null}
      </p>
      <p className="uc-modal-irreversible">Depois de confirmar, não dá para desfazer.</p>
    </Modal>
  )
}
