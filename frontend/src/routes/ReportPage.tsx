import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Pagination } from '@/components/Pagination'
import { SearchField } from '@/components/SearchField'
import { StudentAvatar } from '@/components/StudentAvatar'
import { useCourseReport, type CourseReportEntry } from '@/courses/report.api'
import { useCourse } from '@/courses/useCourses'
import { EMPTY } from '@/lib/format'
import { useDebounced } from '@/lib/useDebounced'
import { isBelowMinimum, MINIMUM_ATTENDANCE_RATE, ratePercent } from '@/lib/attendance-rate'

function RateMeter({ entry, name }: { entry: CourseReportEntry; name: string }) {
  if (entry.attendanceRate === null) {
    return (
      <div
        className="uc-meter is-empty uc-report-meter"
        role="img"
        aria-label={`Frequência de ${name} sem dado: nenhuma aula confirmada ainda`}
      >
        <div className="uc-meter-head">
          <span className="uc-meter-label" />
          <span className="uc-meter-value">{EMPTY}</span>
        </div>
        <div className="uc-meter-track" />
      </div>
    )
  }

  const rate = ratePercent(entry.attendanceRate)
  const below = isBelowMinimum(entry.attendanceRate)

  return (
    <div
      className={below ? 'uc-meter is-below uc-report-meter' : 'uc-meter uc-report-meter'}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rate}
      aria-label={
        below
          ? `Frequência de ${name}: ${rate}%, abaixo do mínimo de ${MINIMUM_ATTENDANCE_RATE}%`
          : `Frequência de ${name}: ${rate}%`
      }
    >
      <div className="uc-meter-head">
        <span className="uc-meter-label uc-report-meter-label">
          {below ? 'Abaixo do mínimo' : ''}
        </span>
        <span className="uc-meter-value">{rate}%</span>
      </div>
      <div className="uc-meter-track">
        <div className="uc-meter-fill" style={{ width: `${rate}%` }} />
        <span className="uc-meter-min" aria-hidden="true" />
      </div>
    </div>
  )
}

export function ReportPage() {
  const { courseId } = useParams()
  const { data: course } = useCourse(courseId)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const query = useDebounced(search)
  const { data, isPending, isFetching } = useCourseReport(courseId, page, query)

  const summary = data?.summary
  const entries = data?.data ?? []

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
          </ol>
        </nav>
        <h1 className="uc-page-title">Relatório de frequência</h1>
        <p className="uc-report-note">
          A porcentagem de cada aluno considera só as {summary?.confirmedSessions ?? 0}{' '}
          {summary?.confirmedSessions === 1 ? 'aula confirmada' : 'aulas confirmadas'}.
        </p>
      </header>

      <div className="uc-stat-row">
        <div className="uc-card uc-stat">
          <span className="uc-stat-label">
            <span className="uc-stat-dot" aria-hidden="true" />
            Alunos
          </span>
          <span className="uc-stat-value">{summary?.students ?? 0}</span>
          <span className="uc-stat-meta">Matrículas ativas</span>
        </div>
        <div className="uc-card uc-stat">
          <span className="uc-stat-label">
            <span className="uc-stat-dot uc-stat-dot-success" aria-hidden="true" />
            Aulas confirmadas
          </span>
          <span className="uc-stat-value">{summary?.confirmedSessions ?? 0}</span>
          <span className="uc-stat-meta">Base da porcentagem</span>
        </div>
        <div className="uc-card uc-stat">
          <span className="uc-stat-label">
            <span className="uc-stat-dot uc-stat-dot-warning" aria-hidden="true" />
            Aguardando confirmação
          </span>
          <span className="uc-stat-value">{summary?.pendingSessions ?? 0}</span>
          <span className="uc-stat-meta">Fora da porcentagem até você confirmar</span>
        </div>
      </div>

      <section className="uc-card" aria-labelledby="frequencia" style={{ overflow: 'hidden' }}>
        <header className="uc-card-head" style={{ flexWrap: 'wrap' }}>
          <h2 className="uc-card-title" id="frequencia">
            Frequência por aluno
          </h2>
          <div style={{ width: '280px', maxWidth: '100%' }}>
            <SearchField
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              placeholder="Buscar por nome ou RA"
              label="Buscar aluno"
              busy={isFetching && !isPending}
            />
          </div>
        </header>

        {isPending ? (
          <div className="uc-card-body" aria-busy="true">
            <span className="uc-skeleton uc-skeleton-text" style={{ width: '60%' }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="uc-empty">
            <span className="uc-empty-icon">
              <span
                className={`uc-icon uc-icon-lg ${query ? 'uc-i-search-x' : 'uc-i-users'}`}
                aria-hidden="true"
              />
            </span>
            <h3 className="uc-empty-title">
              {query ? `Nenhum aluno para "${query}"` : 'Nenhum aluno matriculado'}
            </h3>
            <p className="uc-empty-body">
              {query
                ? 'Confira a busca ou limpe o filtro.'
                : 'Matricule os alunos para acompanhar a frequência.'}
            </p>
          </div>
        ) : (
          <>
            <div className="uc-table-wrap uc-card-table-wrap">
              <table className="uc-table">
                <thead>
                  <tr>
                    <th scope="col">Aluno</th>
                    <th scope="col">RA</th>
                    <th scope="col" className="uc-col-num">
                      Presenças
                    </th>
                    <th scope="col" className="uc-col-meter">
                      Frequência
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.student.id}>
                      <td>
                        <div className="uc-student">
                          <StudentAvatar
                            name={entry.student.name}
                            photoUrl={entry.student.photoUrl}
                          />
                          <span className="uc-student-name">{entry.student.name}</span>
                        </div>
                      </td>
                      <td className="uc-cell-muted">{entry.student.ra}</td>
                      <td className="uc-col-num">
                        {entry.attendedSessions} de {summary?.confirmedSessions ?? 0}
                      </td>
                      <td>
                        <RateMeter entry={entry} name={entry.student.name} />
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
  )
}
