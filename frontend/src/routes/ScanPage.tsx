import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PERIOD_LABELS } from '@/courses/courses.api'
import { formatTime, formatTimeWithSeconds } from '@/lib/format'
import { POSITION_MESSAGES, requestPosition, type PositionResult } from '@/lib/geolocation'
import { RaField } from '@/student/RaField'
import { StudentShell } from '@/student/StudentShell'
import { rememberDeviceToken, storedDeviceToken } from '@/student/device'
import {
  failureOf,
  getScanContext,
  scan,
  type ScanContext,
  type ScanFailure,
  type ScanResponse,
} from '@/student/scan.api'

type Stage =
  | { name: 'loading' }
  | { name: 'ready' }
  | { name: 'submitting' }
  | { name: 'recorded'; result: ScanResponse }
  | { name: 'blockedAlready' }
  | { name: 'blocked'; failure: ScanFailure }

const FIELD_FAILURES: Partial<Record<ScanFailure, string>> = {
  notEnrolled: 'Esse RA não está nesta turma. Confira os números.',
  rateLimited: 'Muitas tentativas seguidas. Espere um instante e tente de novo.',
  offline: 'Não deu para falar com o servidor. Tente de novo.',
  unknown: 'Não deu para registrar agora. Tente de novo.',
}

function ScanBlocked({ failure, context }: { failure: ScanFailure; context: ScanContext | null }) {
  const expired = failure === 'expired'

  return (
    <StudentShell>
      {context ? <CourseHeading context={context} /> : null}
      <div className="uc-student-bottom">
        <div className="uc-banner uc-banner-warning" role="alert">
          <span className={`uc-icon ${expired ? 'uc-i-clock' : 'uc-i-lock'}`} aria-hidden="true" />
          <p className="uc-banner-title uc-student-banner-title">
            {expired
              ? 'O código expirou: escaneie o QR que está na tela agora.'
              : 'A chamada foi encerrada. Fale com o professor.'}
          </p>
        </div>
        {expired ? (
          <button
            className="uc-btn uc-btn-primary uc-btn-lg uc-btn-block"
            type="button"
            onClick={() => window.location.reload()}
          >
            <span className="uc-icon uc-i-scan-line" aria-hidden="true" />
            Escanear o QR de novo
          </button>
        ) : null}
      </div>
    </StudentShell>
  )
}

function CourseHeading({ context }: { context: ScanContext }) {
  return (
    <div>
      <h1 className="uc-student-title">{context.course.name}</h1>
      <p className="uc-student-sub">
        {PERIOD_LABELS[context.course.period]}, com {context.teacherName}
      </p>
      <p className="uc-student-sub uc-student-sub-num">
        Chamada aberta às {formatTime(context.openedAt)}
      </p>
    </div>
  )
}

export function ScanPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t') ?? searchParams.get('token') ?? ''

  const [stage, setStage] = useState<Stage>(() =>
    token ? { name: 'loading' } : { name: 'blocked', failure: 'expired' },
  )
  const [context, setContext] = useState<ScanContext | null>(null)
  const [ra, setRa] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>(undefined)
  const [position, setPosition] = useState<PositionResult | null>(null)
  const [showSteps, setShowSteps] = useState(false)
  const positionRequested = useRef(false)

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()

    getScanContext(token, controller.signal)
      .then((resolved) => {
        setContext(resolved)
        setStage({ name: 'ready' })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setStage({ name: 'blocked', failure: failureOf(error) })
      })

    return () => controller.abort()
  }, [token])

  useEffect(() => {
    if (stage.name !== 'ready' || positionRequested.current) return
    positionRequested.current = true
    void requestPosition().then(setPosition)
  }, [stage.name])

  async function onSubmit() {
    if (!context || ra.length === 0) return

    setFieldError(undefined)
    setStage({ name: 'submitting' })

    try {
      const result = await scan({
        token: context.ticket,
        ra,
        deviceToken: storedDeviceToken(),
        ...(position?.kind === 'granted' ? position.position : {}),
      })
      rememberDeviceToken(result.deviceToken)
      setStage({ name: 'recorded', result })
    } catch (error) {
      const failure = failureOf(error)
      if (failure === 'alreadyRegistered') {
        setStage({ name: 'blockedAlready' })
        return
      }
      const inline = FIELD_FAILURES[failure]
      if (inline) {
        setFieldError(inline)
        setStage({ name: 'ready' })
        return
      }
      setStage({ name: 'blocked', failure })
    }
  }

  if (stage.name === 'loading') {
    return (
      <StudentShell>
        <span className="uc-skeleton uc-skeleton-text" style={{ width: '60%', height: '28px' }} />
        <span className="uc-visually-hidden">Carregando a chamada</span>
      </StudentShell>
    )
  }

  if (stage.name === 'blocked') {
    return <ScanBlocked failure={stage.failure} context={context} />
  }

  if (stage.name === 'blockedAlready') {
    return (
      <StudentShell centred role="status">
        <div className="uc-student-result">
          <span className="uc-student-result-icon uc-student-result-icon-neutral">
            <span className="uc-icon uc-i-info" aria-hidden="true" />
          </span>
          <h1 className="uc-student-title">Presença já registrada</h1>
          <p className="uc-student-sub">{context?.course.name}</p>
          <p className="uc-student-sub uc-student-already">
            Esse RA já registrou presença nesta chamada.
          </p>
          <p className="uc-student-ra-label">Seu RA</p>
          <p className="uc-student-ra-value">{ra}</p>
        </div>
        <p className="uc-student-foot">Pode guardar o celular.</p>
        <button
          className="uc-link uc-student-link"
          type="button"
          onClick={() => {
            setRa('')
            setStage({ name: 'ready' })
          }}
        >
          Digitar outro RA
        </button>
      </StudentShell>
    )
  }

  if (stage.name === 'recorded') {
    return (
      <StudentShell centred role="status">
        <div className="uc-student-result">
          <span className="uc-student-result-icon uc-student-result-icon-success">
            <span className="uc-icon uc-i-check" aria-hidden="true" />
          </span>
          <h1 className="uc-student-title">Presença registrada</h1>
          <p className="uc-student-sub">{context?.course.name}</p>
          <p className="uc-student-sub uc-student-sub-num">
            {formatTimeWithSeconds(stage.result.recordedAt)}
          </p>
          <p className="uc-student-ra-label">Seu RA</p>
          <p className="uc-student-ra-value">{ra}</p>
        </div>
        <p className="uc-student-foot">Pode guardar o celular.</p>
        <Link className="uc-link uc-student-link" to="/consulta">
          Ver minha frequência
        </Link>
      </StudentShell>
    )
  }

  const denied = position !== null && position.kind !== 'granted'

  return (
    <StudentShell>
      {context ? <CourseHeading context={context} /> : null}

      {denied ? (
        <section className="uc-permission" aria-labelledby="perm-t">
          <div className="uc-permission-head">
            <span className="uc-permission-icon">
              <span className="uc-icon uc-icon-md uc-i-map-pin-off" aria-hidden="true" />
            </span>
            <div>
              <h2 className="uc-permission-title" id="perm-t">
                Localização bloqueada
              </h2>
              <p className="uc-permission-body">
                {POSITION_MESSAGES[position.kind]} Você ainda pode registrar presença: o professor
                só vai ver que o registro chegou sem localização.
              </p>
            </div>
          </div>
          <details open={showSteps} onToggle={(event) => setShowSteps(event.currentTarget.open)}>
            <summary>Como permitir</summary>
            <ol>
              <li>
                Toque no ícone à esquerda do endereço (no iPhone, em <strong>aA</strong>).
              </li>
              <li>
                Abra as permissões do site e ative <strong>Localização</strong>.
              </li>
              <li>
                Volte aqui e toque em <strong>Tentar de novo</strong>.
              </li>
            </ol>
          </details>
          <button
            className="uc-btn uc-btn-secondary uc-btn-lg uc-btn-block"
            type="button"
            onClick={() => {
              setPosition(null)
              void requestPosition().then(setPosition)
            }}
          >
            <span className="uc-icon uc-i-refresh-cw" aria-hidden="true" />
            Tentar de novo
          </button>
        </section>
      ) : null}

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
            setFieldError(undefined)
          }}
          disabled={stage.name === 'submitting'}
          error={fieldError}
          autoFocus
        />
        <button
          className="uc-btn uc-btn-primary uc-btn-lg uc-btn-block"
          type="submit"
          disabled={stage.name === 'submitting' || ra.length === 0}
          aria-busy={stage.name === 'submitting'}
        >
          {stage.name === 'submitting' ? <span className="uc-spinner" aria-hidden="true" /> : null}
          {stage.name === 'submitting' ? 'Registrando…' : 'Registrar presença'}
        </button>
      </form>
    </StudentShell>
  )
}
