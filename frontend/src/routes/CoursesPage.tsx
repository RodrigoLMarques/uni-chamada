import { useState } from 'react'
import { Link } from 'react-router'
import { CourseFormModal } from '@/courses/CourseFormModal'
import { INSTITUTION_LABELS, PERIOD_LABELS, type Course } from '@/courses/courses.api'
import { useCourses } from '@/courses/useCourses'
import { EMPTY, formatDate } from '@/lib/format'

function CourseCard({ course }: { course: Course }) {
  return (
    <Link className="uc-card uc-course-card" to={`/turmas/${course.id}`}>
      <span className="uc-page-meta">
        <span className="uc-page-meta-strong">{course.code}</span>
        <span className="uc-badge uc-badge-neutral">{INSTITUTION_LABELS[course.institution]}</span>
      </span>
      <span className="uc-course-card-name">{course.name}</span>
      <span className="uc-page-meta">
        <span>{PERIOD_LABELS[course.period]}</span>
        <span>{course.term}</span>
      </span>
      <span className="uc-page-meta">
        <span>
          <span className="uc-icon uc-i-users" aria-hidden="true" /> {course.enrolledCount}{' '}
          {course.enrolledCount === 1 ? 'matriculado' : 'matriculados'}
        </span>
        <span>
          Última chamada {course.lastSessionAt ? formatDate(course.lastSessionAt) : EMPTY}
        </span>
      </span>
    </Link>
  )
}

export function CoursesPage() {
  const { data: courses, isPending, isError } = useCourses()
  const [creating, setCreating] = useState(false)

  const open = courses?.filter((course) => course.openSessionId) ?? []

  return (
    <>
      <header className="uc-page-head">
        <div className="uc-page-head-main">
          <h1 className="uc-page-title">Turmas</h1>
        </div>
        <button className="uc-btn uc-btn-primary" type="button" onClick={() => setCreating(true)}>
          <span className="uc-icon uc-i-plus" aria-hidden="true" />
          Nova turma
        </button>
      </header>

      {open.length > 0 ? (
        <section className="uc-banner uc-banner-warning" aria-label="Chamada aberta">
          <span className="uc-icon uc-i-clock" aria-hidden="true" />
          <div className="uc-banner-body">
            <p className="uc-banner-title">
              {open.length === 1
                ? 'Você tem uma chamada aberta agora'
                : `Você tem ${open.length} chamadas abertas agora`}
            </p>
            <p>Ela segue recebendo presenças até você encerrar.</p>
          </div>
          <div className="uc-banner-actions">
            {open.map((course) => (
              <Link
                key={course.id}
                className="uc-btn uc-btn-secondary uc-btn-sm"
                to={`/turmas/${course.id}/chamadas/${course.openSessionId}`}
              >
                Voltar para {course.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {isError ? (
        <p className="uc-banner uc-banner-danger" role="alert">
          <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
          Não foi possível carregar suas turmas. Recarregue a página.
        </p>
      ) : null}

      {isPending ? (
        <div className="uc-course-grid" aria-busy="true">
          {[0, 1, 2].map((card) => (
            <div key={card} className="uc-card uc-course-card">
              <span className="uc-skeleton uc-skeleton-text" style={{ width: '40%' }} />
              <span className="uc-skeleton uc-skeleton-text" style={{ width: '75%', height: '20px' }} />
              <span className="uc-skeleton uc-skeleton-text" style={{ width: '55%' }} />
            </div>
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="uc-course-grid">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="uc-empty">
          <span className="uc-empty-icon">
            <span className="uc-icon uc-icon-lg uc-i-book-open" aria-hidden="true" />
          </span>
          <h2 className="uc-empty-title">Nenhuma turma ainda</h2>
          <p className="uc-empty-body">Cadastre a primeira turma para começar a fazer chamada.</p>
          <div className="uc-empty-actions">
            <button className="uc-btn uc-btn-primary" type="button" onClick={() => setCreating(true)}>
              Nova turma
            </button>
          </div>
        </div>
      )}

      {creating ? <CourseFormModal onClose={() => setCreating(false)} /> : null}
    </>
  )
}
