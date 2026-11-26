import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Pagination } from '@/components/Pagination'
import { useStudentReport, type StudentSession } from '@/courses/report.api'
import { useCourse } from '@/courses/useCourses'
import { isBelowMinimum, MINIMUM_ATTENDANCE_RATE, ratePercent } from '@/lib/attendance-rate'
import { EMPTY, formatDate, formatTime } from '@/lib/format'
import { METHOD_ICONS, METHOD_LABELS } from '@/sessions/live.api'

function StatusBadge({ session }: { session: StudentSession }) {
  const present = session.status === 'PRESENT'

  return (
    <span className={`uc-badge ${present ? 'uc-badge-success' : 'uc-badge-danger'}`}>
      <span className={`uc-icon ${present ? 'uc-i-check' : 'uc-i-x'}`} aria-hidden="true" />
      {present ? 'Presente' : 'Falta'}
    </span>
  )
}

export function StudentReportPage() {
  const { courseId, studentId } = useParams()
  const { data: course } = useCourse(courseId)
  const [page, setPage] = useState(1)
  const { data, isPending, isError } = useStudentReport(courseId, studentId, page)

  const summary = data?.summary
  const rate = summary?.attendanceRate ?? null
  const sessions = data?.data ?? []

  return (
    <>
      <header className="uc-page-head-main">
        <nav aria-label="Trilha">
          <ol className="uc-crumbs">
            <li>
              <Link to="/turmas">Turmas</Link>
            </li>
            <li aria-hidden="true" style={{ display: 'flex' }}>
              <span className="uc-icon uc-i-chevron-right" />
            </li>
            <li>
              <Link to={`/turmas/${courseId}`}>{course?.name ?? 'Turma'}</Link>
            </li>
            <li aria-hidden="true" style={{ display: 'flex' }}>
              <span className="uc-icon uc-i-chevron-right" />
            </li>
            <li>
              <Link to={`/turmas/${courseId}/relatorio`}>Relatório</Link>
            </li>
          </ol>
        </nav>
        <h1 className="uc-page-title">{data?.student.name ?? 'Aluno'}</h1>
        <p className="uc-report-note">
          {data ? `RA ${data.student.ra}` : null}
          {summary
            ? `, com ${summary.attendedSessions} ${summary.attendedSessions === 1 ? 'presença' : 'presenças'} em ${summary.confirmedSessions} ${summary.confirmedSessions === 1 ? 'aula confirmada' : 'aulas confirmadas'}`
            : null}
        </p>
      </header>

      {isError ? (
        <div className="uc-empty">
          <span className="uc-empty-icon">
            <span className="uc-icon uc-icon-lg uc-i-circle-alert" aria-hidden="true" />
          </span>
          <h2 className="uc-empty-title">Não encontramos esse aluno na turma</h2>
          <p className="uc-empty-body">
            A matrícula pode ter sido removida. <Link to={`/turmas/${courseId}/relatorio`}>Voltar ao relatório</Link>.
          </p>
        </div>
      ) : (
        <>
          <div className="uc-stat-row">
            <div className="uc-card uc-stat">
              <span className="uc-stat-label">
                <span className="uc-stat-dot" aria-hidden="true" />
                Frequência
              </span>
              <span className="uc-stat-value">{rate === null ? EMPTY : `${ratePercent(rate)}%`}</span>
              <span className="uc-stat-meta">
                {rate === null
                  ? 'Nenhuma aula confirmada ainda'
                  : isBelowMinimum(rate)
                    ? `Abaixo do mínimo de ${MINIMUM_ATTENDANCE_RATE}%`
                    : `Mínimo de ${MINIMUM_ATTENDANCE_RATE}%`}
              </span>
            </div>
            <div className="uc-card uc-stat">
              <span className="uc-stat-label">
                <span className="uc-stat-dot uc-stat-dot-success" aria-hidden="true" />
                Presenças
              </span>
              <span className="uc-stat-value">{summary?.attendedSessions ?? 0}</span>
              <span className="uc-stat-meta">Em aulas confirmadas</span>
            </div>
            <div className="uc-card uc-stat">
              <span className="uc-stat-label">
                <span className="uc-stat-dot uc-stat-dot-danger" aria-hidden="true" />
                Faltas
              </span>
              <span className="uc-stat-value">
                {Math.max(0, (summary?.confirmedSessions ?? 0) - (summary?.attendedSessions ?? 0))}
              </span>
              <span className="uc-stat-meta">Em aulas confirmadas</span>
            </div>
          </div>

          <section className="uc-card" aria-labelledby="dias" style={{ overflow: 'hidden' }}>
            <header className="uc-card-head">
              <h2 className="uc-card-title" id="dias">
                Aula por aula
              </h2>
              {summary && summary.pendingSessions > 0 ? (
                <span className="uc-badge uc-badge-warning">
                  <span className="uc-icon uc-i-hourglass" aria-hidden="true" />
                  {summary.pendingSessions}{' '}
                  {summary.pendingSessions === 1 ? 'aula sem confirmar' : 'aulas sem confirmar'}
                </span>
              ) : null}
            </header>

            {isPending ? (
              <div className="uc-card-body" aria-busy="true">
                <span className="uc-skeleton uc-skeleton-text" style={{ width: '60%' }} />
              </div>
            ) : sessions.length === 0 ? (
              <div className="uc-empty">
                <span className="uc-empty-icon">
                  <span className="uc-icon uc-icon-lg uc-i-calendar-clock" aria-hidden="true" />
                </span>
                <h3 className="uc-empty-title">Nenhuma chamada encerrada</h3>
                <p className="uc-empty-body">
                  Assim que você encerrar a primeira chamada, os dias aparecem aqui.
                </p>
              </div>
            ) : (
              <>
                <div className="uc-table-wrap uc-card-table-wrap">
                  <table className="uc-table">
                    <thead>
                      <tr>
                        <th scope="col">Dia</th>
                        <th scope="col">Situação</th>
                        <th scope="col">Registro</th>
                        <th scope="col" className="uc-col-link">
                          <span className="uc-visually-hidden">Chamada</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.sessionId}>
                          <td>
                            <span className="uc-student-name">{formatDate(session.startsAt)}</span>
                            <span className="uc-cell-sub">{formatTime(session.startsAt)}</span>
                          </td>
                          <td>
                            <div className="uc-cell-stack">
                              <StatusBadge session={session} />
                              {session.confirmed ? null : (
                                <span className="uc-badge uc-badge-warning">
                                  <span className="uc-icon uc-i-hourglass" aria-hidden="true" />
                                  Sem confirmar
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="uc-cell-muted">
                            {session.method && session.recordedAt ? (
                              <span className="uc-cell-method">
                                <span
                                  className={`uc-icon ${METHOD_ICONS[session.method]}`}
                                  aria-hidden="true"
                                />
                                {METHOD_LABELS[session.method]} às {formatTime(session.recordedAt)}
                              </span>
                            ) : (
                              EMPTY
                            )}
                          </td>
                          <td className="uc-col-link">
                            <Link
                              className="uc-link"
                              to={`/turmas/${courseId}/chamadas/${session.sessionId}`}
                            >
                              Ver chamada
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data ? (
                  <div className="uc-card-foot">
                    <Pagination pagination={data.pagination} onChange={setPage} />
                  </div>
                ) : null}
              </>
            )}
          </section>
        </>
      )}
    </>
  )
}
