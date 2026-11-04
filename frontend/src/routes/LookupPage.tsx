import { useState } from 'react'
import { PERIOD_LABELS } from '@/courses/courses.api'
import { NetworkError } from '@/lib/api'
import { AttendanceMeter } from '@/student/AttendanceMeter'
import { RaField } from '@/student/RaField'
import { StudentShell } from '@/student/StudentShell'
import { getStudentAttendance, isNotFound, type StudentAttendance } from '@/student/lookup.api'

const NOT_FOUND =
  'Não encontramos frequência para esse RA. Confira os números ou fale com o professor da turma.'

export function LookupPage() {
  const [ra, setRa] = useState('')
  const [result, setResult] = useState<StudentAttendance | null>(null)
  const [error, setError] = useState<string | undefined>(undefined)
  const [searching, setSearching] = useState(false)

  async function onSubmit() {
    if (ra.length === 0) return
    setSearching(true)
    setError(undefined)

    try {
      setResult(await getStudentAttendance(ra))
    } catch (caught) {
      // RA inexistente e RA sem matrícula dão a MESMA resposta: a rota é pública
      // e não pode virar verificador de matrícula para quem tenta RAs ao acaso.
      if (isNotFound(caught)) setError(NOT_FOUND)
      else if (caught instanceof NetworkError) setError(caught.message)
      else setError('Não deu para consultar agora. Tente de novo.')
    } finally {
      setSearching(false)
    }
  }

  if (result) {
    const term = result.courses[0]?.course.term

    return (
      <StudentShell>
        <div>
          <h1 className="uc-student-title">Sua frequência</h1>
          <p className="uc-student-name">{result.student.name}</p>
          <p className="uc-student-sub uc-student-sub-num uc-student-meta">
            <span>RA {result.student.ra}</span>
            {term ? <span>Semestre {term}</span> : null}
          </p>
        </div>

        {result.courses.length === 0 ? (
          <div className="uc-empty">
            <span className="uc-empty-icon">
              <span className="uc-icon uc-icon-lg uc-i-book-open" aria-hidden="true" />
            </span>
            <h2 className="uc-empty-title">Nenhuma turma ainda</h2>
            <p className="uc-empty-body">Esse RA não está matriculado em nenhuma turma.</p>
          </div>
        ) : (
          result.courses.map((summary) => (
            <section key={summary.course.id} className="uc-card uc-card-body uc-student-course">
              <div>
                <h2 className="uc-student-course-name">{summary.course.name}</h2>
                <p className="uc-student-course-meta">
                  <span>{summary.course.code}</span>
                  <span>{PERIOD_LABELS[summary.course.period]}</span>
                </p>
              </div>
              <AttendanceMeter summary={summary} />
            </section>
          ))
        )}

        <button
          className="uc-link uc-student-link"
          type="button"
          onClick={() => {
            setResult(null)
            setRa('')
          }}
        >
          Consultar outro RA
        </button>
      </StudentShell>
    )
  }

  return (
    <StudentShell>
      <div>
        <h1 className="uc-student-title">Consultar frequência</h1>
        <p className="uc-student-sub">
          Digite seu RA e veja só a sua frequência, turma por turma.
        </p>
      </div>

      <form
        className="uc-student-bottom"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit()
        }}
      >
        <RaField
          value={ra}
          onChange={(next) => {
            setRa(next)
            setError(undefined)
          }}
          disabled={searching}
          error={error}
          enterKeyHint="search"
          autoFocus
        />
        <button
          className="uc-btn uc-btn-primary uc-btn-lg uc-btn-block"
          type="submit"
          disabled={searching || ra.length === 0}
          aria-busy={searching}
        >
          {searching ? <span className="uc-spinner" aria-hidden="true" /> : null}
          {searching ? 'Consultando…' : 'Consultar frequência'}
        </button>
      </form>
    </StudentShell>
  )
}
