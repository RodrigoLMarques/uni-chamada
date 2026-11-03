import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Pagination } from '@/components/Pagination'
import { SearchField } from '@/components/SearchField'
import { StudentAvatar } from '@/components/StudentAvatar'
import { useToast } from '@/components/useToast'
import { useCourse } from '@/courses/useCourses'
import { AddStudentModal } from '@/enrollments/AddStudentModal'
import { EditStudentModal } from '@/enrollments/EditStudentModal'
import { ENROLLMENT_STATUS_LABELS, type Enrollment } from '@/enrollments/enrollments.api'
import { useDropEnrollment, useEnrollments } from '@/enrollments/useEnrollments'
import { EMPTY } from '@/lib/format'
import { useDebounced } from '@/lib/useDebounced'

export function RosterPage() {
  const { courseId } = useParams()
  const { notify } = useToast()
  const { data: course } = useCourse(courseId)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const query = useDebounced(search)
  const { data, isPending, isFetching } = useEnrollments(courseId, page, query)
  const drop = useDropEnrollment(courseId ?? '')

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Enrollment | null>(null)
  const [dropping, setDropping] = useState<Enrollment | null>(null)

  const enrollments = data?.data ?? []
  const active = enrollments.filter((entry) => entry.status === 'ACTIVE').length
  const dropped = enrollments.filter((entry) => entry.status === 'DROPPED').length

  async function onDrop() {
    if (!dropping) return
    try {
      await drop.mutateAsync(dropping.student.id)
      notify({ tone: 'success', title: `Matrícula de ${dropping.student.name} cancelada` })
      setDropping(null)
    } catch {
      notify({ tone: 'danger', title: 'Não foi possível cancelar a matrícula' })
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
              <li aria-hidden="true" style={{ display: 'flex' }}>
                <span className="uc-icon uc-i-chevron-right" />
              </li>
              <li>
                <Link to={`/turmas/${courseId}`}>{course?.name ?? 'Turma'}</Link>
              </li>
            </ol>
          </nav>
          <h1 className="uc-page-title">Alunos</h1>
          <div className="uc-page-meta">
            <span>
              {course?.enrolledCount ?? 0}{' '}
              {course?.enrolledCount === 1 ? 'matrícula ativa' : 'matrículas ativas'}
            </span>
            {dropped > 0 ? <span>{dropped} cancelada nesta página</span> : null}
          </div>
        </div>
        <button
          className="uc-btn uc-btn-primary"
          type="button"
          onClick={() => setAdding(true)}
          disabled={!course}
        >
          <span className="uc-icon uc-i-plus" aria-hidden="true" />
          Adicionar aluno
        </button>
      </header>

      <section className="uc-card" aria-labelledby="matriculas" style={{ overflow: 'hidden' }}>
        <header className="uc-card-head" style={{ flexWrap: 'wrap' }}>
          <h2 className="uc-card-title" id="matriculas">
            Matrículas
          </h2>
          <div style={{ width: '320px', maxWidth: '100%' }}>
            <SearchField
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              placeholder="Buscar por nome, RA ou e-mail"
              label="Buscar aluno"
              busy={isFetching && !isPending}
            />
          </div>
        </header>

        {isPending ? (
          <div className="uc-card-body" aria-busy="true">
            <span className="uc-skeleton uc-skeleton-text" style={{ width: '60%' }} />
          </div>
        ) : enrollments.length === 0 ? (
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
                : 'Adicione os alunos para que eles possam registrar presença.'}
            </p>
            <div className="uc-empty-actions">
              {query ? (
                <button className="uc-btn uc-btn-secondary" type="button" onClick={() => setSearch('')}>
                  Limpar busca
                </button>
              ) : (
                <button className="uc-btn uc-btn-primary" type="button" onClick={() => setAdding(true)}>
                  Adicionar aluno
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="uc-table-wrap uc-card-table-wrap">
              <table className="uc-table">
                <thead>
                  <tr>
                    <th scope="col">Aluno</th>
                    <th scope="col">RA</th>
                    <th scope="col">E-mail</th>
                    <th scope="col">Ingresso</th>
                    <th scope="col">Matrícula</th>
                    <th scope="col">
                      <span className="uc-visually-hidden">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((entry) => (
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
                      <td className="uc-cell-muted">{entry.student.email ?? EMPTY}</td>
                      <td>{entry.student.entryYear ?? EMPTY}</td>
                      <td>
                        <span
                          className={`uc-badge ${
                            entry.status === 'ACTIVE' ? 'uc-badge-neutral' : 'uc-badge-dashed'
                          }`}
                        >
                          <span
                            className={`uc-icon ${
                              entry.status === 'ACTIVE' ? 'uc-i-user-check' : 'uc-i-user-minus'
                            }`}
                            aria-hidden="true"
                          />
                          {ENROLLMENT_STATUS_LABELS[entry.status]}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                          <button
                            className="uc-btn uc-btn-ghost uc-btn-sm"
                            type="button"
                            onClick={() => setEditing(entry)}
                          >
                            Editar
                          </button>
                          {entry.status === 'ACTIVE' ? (
                            <button
                              className="uc-btn uc-btn-ghost uc-btn-sm"
                              type="button"
                              onClick={() => setDropping(entry)}
                            >
                              Cancelar
                            </button>
                          ) : null}
                        </div>
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

      {adding && course ? (
        <AddStudentModal
          courseId={course.id}
          courseLabel={course.name}
          defaultInstitution={course.institution}
          onClose={() => setAdding(false)}
        />
      ) : null}

      {editing && courseId ? (
        <EditStudentModal
          courseId={courseId}
          enrollment={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {dropping ? (
        <ConfirmModal
          title={`Cancelar a matrícula de ${dropping.student.name}?`}
          description="O aluno deixa de contar nas próximas chamadas. As presenças já registradas continuam no histórico."
          confirmLabel="Cancelar matrícula"
          cancelLabel="Manter matrícula"
          busy={drop.isPending}
          onConfirm={onDrop}
          onClose={() => setDropping(null)}
        />
      ) : null}

      <span aria-live="polite" className="uc-visually-hidden">
        {isPending ? '' : `${active} matrículas ativas nesta página`}
      </span>
    </>
  )
}
