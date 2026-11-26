import { useQuery } from '@tanstack/react-query'
import { PERIOD_LABELS } from '@/courses/courses.api'
import { formatDate, formatTime } from '@/lib/format'
import { AttendanceMeter } from './AttendanceMeter'
import { getStudentCourseSessions, type StudentCourseSummary } from './lookup.api'

export function CourseDays({
  ra,
  summary,
  onBack,
}: {
  ra: string
  summary: StudentCourseSummary
  onBack: () => void
}) {
  const { course } = summary
  const { data, isPending, isError } = useQuery({
    queryKey: ['student-sessions', ra, course.id],
    queryFn: ({ signal }) => getStudentCourseSessions(ra, course.id, 1, signal),
  })

  const sessions = data?.data ?? []

  return (
    <>
      <button className="uc-link uc-student-back" type="button" onClick={onBack}>
        <span className="uc-icon uc-i-chevron-left" aria-hidden="true" />
        Todas as turmas
      </button>

      <div>
        <h1 className="uc-student-title">{course.name}</h1>
        <p className="uc-student-sub uc-student-sub-num uc-student-meta">
          <span>{course.code}</span>
          <span>{PERIOD_LABELS[course.period]}</span>
        </p>
      </div>

      <section className="uc-card uc-card-body uc-student-course">
        <AttendanceMeter summary={summary} />
      </section>

      <section aria-labelledby="dias-aluno" className="uc-student-days">
        <h2 className="uc-student-days-title" id="dias-aluno">
          Aula por aula
        </h2>

        {isPending ? (
          <p className="uc-student-days-note" aria-busy="true">
            Carregando as aulas…
          </p>
        ) : isError ? (
          <p className="uc-student-days-note">
            Não deu para carregar as aulas agora. Tente de novo mais tarde.
          </p>
        ) : sessions.length === 0 ? (
          <p className="uc-student-days-note">
            Nenhuma aula confirmada ainda. Os dias aparecem aqui conforme o professor confirma cada
            chamada.
          </p>
        ) : (
          <ul className="uc-day-list">
            {sessions.map((session) => {
              const present = session.status === 'PRESENT'

              return (
                <li
                  className={present ? 'uc-day is-present' : 'uc-day is-absent'}
                  key={session.sessionId}
                >
                  <span
                    className={`uc-icon ${present ? 'uc-i-check' : 'uc-i-x'} uc-day-icon`}
                    aria-hidden="true"
                  />
                  <span className="uc-day-date">{formatDate(session.startsAt)}</span>
                  <span className="uc-day-status">{present ? 'Presente' : 'Falta'}</span>
                  <span className="uc-day-time">
                    {session.recordedAt ? formatTime(session.recordedAt) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
