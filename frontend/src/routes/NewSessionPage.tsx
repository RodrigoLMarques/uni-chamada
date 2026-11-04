import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useToast } from '@/components/useToast'
import { courseKeys, useCourse } from '@/courses/useCourses'
import { POSITION_MESSAGES, requestPosition } from '@/lib/geolocation'
import { ApiError, NetworkError } from '@/lib/api'
import { createSession, openSession, sessionKeys } from '@/sessions/sessions.api'

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return 'Já existe uma chamada aberta nesta turma.'
  }
  if (error instanceof ApiError || error instanceof NetworkError) return error.message
  return 'Não foi possível abrir a chamada. Tente de novo.'
}

export function NewSessionPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const { data: course } = useCourse(courseId)
  const [opening, setOpening] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  async function onOpen() {
    if (!courseId) return
    setOpening(true)
    setFailure(null)

    // A coordenada é pedida ANTES de abrir: ela é a referência contra a qual a
    // distância de cada aluno é medida, e só vale se for capturada na abertura.
    const result = await requestPosition()

    try {
      const session = await createSession(courseId, new Date().toISOString())
      await openSession(
        courseId,
        session.id,
        result.kind === 'granted' ? result.position : undefined,
      )

      void queryClient.invalidateQueries({ queryKey: courseKeys.all })
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) })
      void queryClient.invalidateQueries({ queryKey: sessionKeys.byCourse(courseId) })

      if (result.kind !== 'granted') {
        // Dizer QUAL desfecho aconteceu: bloqueado, demorado e indisponível têm
        // causas e soluções diferentes.
        notify({
          tone: 'warning',
          title: 'Chamada aberta sem localização',
          body: `${POSITION_MESSAGES[result.kind]} A verificação de distância fica desligada nesta chamada.`,
        })
      }

      void navigate(`/turmas/${courseId}/chamadas/${session.id}`, { replace: true })
    } catch (error) {
      setFailure(messageFor(error))
      setOpening(false)
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
          <h1 className="uc-page-title">Abrir chamada</h1>
        </div>
      </header>

      <section className="uc-card uc-card-body" style={{ maxWidth: '640px' }}>
        <div className="uc-form-stack">
          {failure ? (
            <p className="uc-banner uc-banner-danger" role="alert">
              <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
              {failure}
            </p>
          ) : null}

          <p style={{ margin: 0, font: 'var(--text-type-body)' }}>
            A chamada abre agora e os {course?.enrolledCount ?? 0} alunos de {course?.name ?? 'turma'}{' '}
            passam a poder registrar presença pelo QR.
          </p>

          <p
            style={{
              margin: 0,
              display: 'flex',
              gap: 'var(--space-2)',
              font: 'var(--text-type-body-sm)',
              color: 'var(--text-muted)',
            }}
          >
            <span className="uc-icon uc-i-map-pin" aria-hidden="true" />
            O navegador vai pedir sua localização. Ela marca de onde a aula acontece e é o ponto de
            referência para medir a distância de cada registro. Se você recusar, a chamada abre
            assim mesmo e essa verificação fica desligada.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <button
              className="uc-btn uc-btn-primary"
              type="button"
              onClick={onOpen}
              disabled={opening || !course}
              aria-busy={opening}
            >
              {opening ? <span className="uc-spinner" aria-hidden="true" /> : null}
              {opening ? 'Abrindo…' : 'Abrir chamada'}
            </button>
            <Link className="uc-btn uc-btn-secondary" to={`/turmas/${courseId}`}>
              Cancelar
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
