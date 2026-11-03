import { useId, useState } from 'react'
import { Modal } from '@/components/Modal'
import { StudentAvatar } from '@/components/StudentAvatar'
import { useToast } from '@/components/useToast'
import { ApiError, NetworkError } from '@/lib/api'
import type { Enrollment } from './enrollments.api'
import { useUpdateEnrollment } from './useEnrollments'

function messageFor(error: unknown): string {
  if (error instanceof ApiError || error instanceof NetworkError) return error.message
  return 'Não foi possível salvar o aluno. Tente de novo.'
}

export function EditStudentModal({
  courseId,
  enrollment,
  onClose,
}: {
  courseId: string
  enrollment: Enrollment
  onClose: () => void
}) {
  const { notify } = useToast()
  const update = useUpdateEnrollment(courseId)
  const [name, setName] = useState(enrollment.student.name)
  const [email, setEmail] = useState(enrollment.student.email ?? '')
  const [entryYear, setEntryYear] = useState(
    enrollment.student.entryYear ? String(enrollment.student.entryYear) : '',
  )
  const [reactivate, setReactivate] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const nameId = useId()
  const emailId = useId()
  const yearId = useId()
  const reactivateId = useId()

  // O RA identifica o aluno nas presenças já registradas: não é editável aqui.
  const changed =
    name !== enrollment.student.name ||
    email !== (enrollment.student.email ?? '') ||
    entryYear !== (enrollment.student.entryYear ? String(enrollment.student.entryYear) : '') ||
    reactivate

  async function onSubmit() {
    setFailure(null)
    try {
      await update.mutateAsync({
        studentId: enrollment.student.id,
        name,
        email: email.trim() || null,
        entryYear: entryYear ? Number(entryYear) : null,
        status: reactivate ? 'ACTIVE' : undefined,
      })
      notify({ tone: 'success', title: 'Aluno atualizado' })
      onClose()
    } catch (error) {
      setFailure(messageFor(error))
    }
  }

  return (
    <Modal
      title="Editar aluno"
      description={`RA ${enrollment.student.ra}, em uso nas presenças já registradas.`}
      busy={update.isPending}
      onClose={onClose}
      actions={
        <>
          <button className="uc-btn uc-btn-secondary" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="uc-btn uc-btn-primary"
            type="button"
            onClick={onSubmit}
            disabled={!changed || update.isPending}
            aria-busy={update.isPending}
          >
            {update.isPending ? <span className="uc-spinner" aria-hidden="true" /> : null}
            Salvar aluno
          </button>
        </>
      }
    >
      {failure ? (
        <p className="uc-banner uc-banner-danger" role="alert">
          <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
          {failure}
        </p>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
        <StudentAvatar
          name={enrollment.student.name}
          photoUrl={enrollment.student.photoUrl}
          size="lg"
        />
        <div className="uc-readonly-grid">
          <div className="uc-field uc-span-2">
            <label className="uc-label" htmlFor={nameId}>
              Nome
            </label>
            <input
              className="uc-input"
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="uc-field">
            <label className="uc-label" htmlFor={yearId}>
              Ingresso
            </label>
            <input
              className="uc-input"
              id={yearId}
              value={entryYear}
              inputMode="numeric"
              maxLength={4}
              style={{ fontVariantNumeric: 'tabular-nums' }}
              onChange={(event) => setEntryYear(event.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="uc-field uc-span-2">
            <label className="uc-label" htmlFor={emailId}>
              E-mail
            </label>
            <input
              className="uc-input"
              id={emailId}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>
      </div>

      {enrollment.status === 'DROPPED' ? (
        <div className="uc-field">
          <label
            htmlFor={reactivateId}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <input
              className="uc-check"
              id={reactivateId}
              type="checkbox"
              checked={reactivate}
              onChange={(event) => setReactivate(event.target.checked)}
            />
            Reativar a matrícula nesta turma
          </label>
        </div>
      ) : null}
    </Modal>
  )
}
