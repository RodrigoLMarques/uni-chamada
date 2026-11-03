import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useToast } from '@/components/useToast'
import { CourseFormModal } from '@/courses/CourseFormModal'
import { INSTITUTION_LABELS, PERIOD_LABELS } from '@/courses/courses.api'
import { useCourse, useDeleteCourse } from '@/courses/useCourses'
import { formatDate, formatTime } from '@/lib/format'
import {
  SESSION_STATUS_BADGES,
  SESSION_STATUS_ICONS,
  SESSION_STATUS_LABELS,
  useSessions,
} from '@/sessions/sessions.api'

export function CoursePage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { data: course, isPending } = useCourse(courseId)
  const { data: sessions, isPending: sessionsPending } = useSessions(courseId)
  const remove = useDeleteCourse()
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (isPending || !course) {
    return (
      <div aria-busy="true">
        <span className="uc-skeleton uc-skeleton-text" style={{ width: '240px', height: '28px' }} />
      </div>
    )
  }

  async function onDelete() {
    if (!course) return
    try {
      await remove.mutateAsync(course.id)
      notify({ tone: 'success', title: 'Turma excluída' })
      void navigate('/turmas', { replace: true })
    } catch {
      notify({ tone: 'danger', title: 'Não foi possível excluir a turma' })
      setConfirmingDelete(false)
    }
  }

  return (
    <>
      <header className="uc-page-head">
        <div className="uc-page-head-main">
          <nav aria-label="Trilha">
            <ol className="uc-crumbs">
              <li>
                <Link to="/turmas">Turmas</Link>
              </li>
            </ol>
          </nav>
          <h1 className="uc-page-title">{course.name}</h1>
          <div className="uc-page-meta">
            <span className="uc-page-meta-strong">{course.code}</span>
            <span>{PERIOD_LABELS[course.period]}</span>
            <span>{course.term}</span>
            <span className="uc-badge uc-badge-neutral">
              {INSTITUTION_LABELS[course.institution]}
            </span>
            <span>
              <span className="uc-icon uc-i-users" aria-hidden="true" /> {course.enrolledCount}{' '}
              {course.enrolledCount === 1 ? 'matriculado' : 'matriculados'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <button className="uc-btn uc-btn-secondary" type="button" onClick={() => setEditing(true)}>
            Editar
          </button>
          <Link
            className="uc-btn uc-btn-primary"
            to={
              course.openSessionId
                ? `/turmas/${course.id}/chamadas/${course.openSessionId}`
                : `/turmas/${course.id}/chamadas/nova`
            }
          >
            <span className="uc-icon uc-i-plus" aria-hidden="true" />
            {course.openSessionId ? 'Voltar para a chamada' : 'Abrir chamada'}
          </Link>
        </div>
      </header>

      {course.openSessionId ? (
        <section className="uc-banner uc-banner-warning" aria-label="Chamada aberta">
          <span className="uc-icon uc-i-clock" aria-hidden="true" />
          <div className="uc-banner-body">
            <p className="uc-banner-title">Chamada aberta agora</p>
            <p>Ela segue recebendo presenças até você encerrar.</p>
          </div>
        </section>
      ) : (
        <section className="uc-card uc-empty" aria-label="Chamada de hoje">
          <span className="uc-empty-icon">
            <span className="uc-icon uc-icon-lg uc-i-calendar" aria-hidden="true" />
          </span>
          <h2 className="uc-empty-title">Nenhuma chamada hoje</h2>
          <p className="uc-empty-body">Abra uma chamada quando a aula começar.</p>
        </section>
      )}

      <section className="uc-card" aria-labelledby="historico" style={{ overflow: 'hidden' }}>
        <header className="uc-card-head">
          <h2 className="uc-card-title" id="historico">
            Últimas chamadas
          </h2>
        </header>

        {sessionsPending ? (
          <div className="uc-card-body" aria-busy="true">
            <span className="uc-skeleton uc-skeleton-text" style={{ width: '60%' }} />
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="uc-table-wrap uc-card-table-wrap">
            <table className="uc-table">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Horário</th>
                  <th scope="col" className="uc-col-num">
                    Presentes
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const icon = SESSION_STATUS_ICONS[session.status]
                  return (
                    <tr key={session.id}>
                      <td>
                        <Link className="uc-link" to={`/turmas/${course.id}/chamadas/${session.id}`}>
                          {formatDate(session.startsAt)}
                        </Link>
                      </td>
                      <td>{formatTime(session.startsAt)}</td>
                      <td className="uc-col-num">
                        {session.presentCount} de {course.enrolledCount}
                      </td>
                      <td>
                        <span className={`uc-badge ${SESSION_STATUS_BADGES[session.status]}`}>
                          {icon ? <span className={`uc-icon ${icon}`} aria-hidden="true" /> : null}
                          {SESSION_STATUS_LABELS[session.status]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="uc-empty">
            <span className="uc-empty-icon">
              <span className="uc-icon uc-icon-lg uc-i-inbox" aria-hidden="true" />
            </span>
            <h3 className="uc-empty-title">Nenhuma chamada registrada</h3>
            <p className="uc-empty-body">O histórico aparece aqui depois da primeira chamada.</p>
          </div>
        )}
      </section>

      <div>
        <button
          className="uc-btn uc-btn-ghost uc-btn-sm"
          type="button"
          onClick={() => setConfirmingDelete(true)}
          style={{ color: 'var(--danger-solid)' }}
        >
          Excluir turma
        </button>
      </div>

      {editing ? <CourseFormModal course={course} onClose={() => setEditing(false)} /> : null}

      {confirmingDelete ? (
        <ConfirmModal
          title={`Excluir ${course.name}?`}
          description={`As ${course.enrolledCount} matrículas e o histórico de chamadas desta turma saem junto. Não dá para desfazer.`}
          confirmLabel="Excluir turma"
          cancelLabel="Manter turma"
          busy={remove.isPending}
          onConfirm={onDelete}
          onClose={() => setConfirmingDelete(false)}
        />
      ) : null}
    </>
  )
}
