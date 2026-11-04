import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ConfirmModal } from '@/components/ConfirmModal'
import { SearchField } from '@/components/SearchField'
import { StudentAvatar } from '@/components/StudentAvatar'
import { useToast } from '@/components/useToast'
import { useCourse } from '@/courses/useCourses'
import { EMPTY, formatDate, formatTime, formatTimeWithSeconds } from '@/lib/format'
import { AttendanceFlagList } from '@/sessions/AttendanceFlags'
import { ProjectionView } from '@/sessions/ProjectionView'
import { QrFrame } from '@/sessions/QrFrame'
import {
  hasAnyFlag,
  METHOD_ICONS,
  METHOD_LABELS,
  type RollEntry,
} from '@/sessions/live.api'
import {
  SESSION_STATUS_BADGES,
  SESSION_STATUS_ICONS,
  SESSION_STATUS_LABELS,
  useSession,
} from '@/sessions/sessions.api'
import { useCloseSession, useDeleteSession, useLiveSession } from '@/sessions/useLiveSession'

const TABS = ['all', 'present', 'absent', 'flagged'] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  all: 'Todos',
  present: 'Presentes',
  absent: 'Ausentes',
  flagged: 'Com avisos',
}

function matches(entry: RollEntry, tab: Tab): boolean {
  if (tab === 'present') return entry.status === 'PRESENT'
  if (tab === 'absent') return entry.status === 'ABSENT'
  if (tab === 'flagged') return hasAnyFlag(entry.flags)
  return true
}

function byRecency(a: RollEntry, b: RollEntry): number {
  if (a.recordedAt && b.recordedAt) return b.recordedAt.localeCompare(a.recordedAt)
  if (a.recordedAt) return -1
  if (b.recordedAt) return 1
  return a.student.name.localeCompare(b.student.name, 'pt-BR')
}

export function SessionPage() {
  const { courseId, sessionId } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { data: course } = useCourse(courseId)
  const { data: session } = useSession(courseId, sessionId)

  const open = session?.status === 'OPEN'
  const { live, roll, reconnecting } = useLiveSession(courseId ?? '', sessionId ?? '', open)
  const close = useCloseSession(courseId ?? '', sessionId ?? '')
  const remove = useDeleteSession(courseId ?? '', sessionId ?? '')

  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [confirmingClose, setConfirmingClose] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const projecting = searchParams.get('projecao') === '1'

  const setProjecting = useCallback(
    (on: boolean) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (on) next.set('projecao', '1')
          else next.delete('projecao')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const entries = useMemo(() => roll.data?.data ?? [], [roll.data])

  const counts = useMemo(
    () => ({
      all: entries.length,
      present: entries.filter((entry) => entry.status === 'PRESENT').length,
      absent: entries.filter((entry) => entry.status === 'ABSENT').length,
      flagged: entries.filter((entry) => hasAnyFlag(entry.flags)).length,
    }),
    [entries],
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return entries
      .filter((entry) => matches(entry, tab))
      .filter(
        (entry) =>
          !term ||
          entry.student.name.toLowerCase().includes(term) ||
          entry.student.ra.includes(term),
      )
      .sort(byRecency)
  }, [entries, tab, search])

  useEffect(() => {
    if (!projecting) return

    void document.documentElement.requestFullscreen?.().catch(() => {})

    let release: (() => void) | undefined
    void navigator.wakeLock
      ?.request('screen')
      .then((lock) => {
        release = () => void lock.release().catch(() => {})
      })
      .catch(() => {})

    function onFullscreenChange() {
      if (!document.fullscreenElement) setProjecting(false)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      release?.()
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [projecting, setProjecting])

  async function onClose() {
    try {
      await close.mutateAsync()
      notify({ tone: 'success', title: 'Chamada encerrada' })
      void navigate(`/turmas/${courseId}`, { replace: true })
    } catch {
      notify({ tone: 'danger', title: 'Não foi possível encerrar a chamada' })
      setConfirmingClose(false)
    }
  }

  async function onDelete() {
    try {
      await remove.mutateAsync()
      notify({ tone: 'success', title: 'Chamada excluída' })
      void navigate(`/turmas/${courseId}`, { replace: true })
    } catch {
      notify({ tone: 'danger', title: 'Não foi possível excluir a chamada' })
      setConfirmingDelete(false)
    }
  }

  if (!session || !course) {
    return (
      <div aria-busy="true">
        <span className="uc-skeleton uc-skeleton-text" style={{ width: '280px', height: '28px' }} />
      </div>
    )
  }

  const courseLabel = `${course.name}, ${course.code}`
  const summary = live.data?.summary ?? roll.data?.summary

  if (projecting) {
    return (
      <ProjectionView
        courseName={course.name}
        courseLabel={courseLabel}
        qr={live.data?.qr ?? null}
        presentCount={summary?.present ?? 0}
        onExit={() => setProjecting(false)}
      />
    )
  }

  return (
    <>
      <header className="uc-session-head">
        <div className="uc-page-head-main" style={{ flex: '1 1 360px' }}>
          <nav aria-label="Trilha">
            <ol className="uc-crumbs">
              <li>
                <Link to="/turmas">Turmas</Link>
              </li>
              <li aria-hidden="true" style={{ display: 'flex' }}>
                <span className="uc-icon uc-i-chevron-right" />
              </li>
              <li>
                <Link to={`/turmas/${courseId}`}>{course.name}</Link>
              </li>
            </ol>
          </nav>
          <h1 className="uc-page-title" style={{ fontVariantNumeric: 'tabular-nums' }}>
            Chamada de {formatDate(session.startsAt)} às {formatTime(session.startsAt)}
          </h1>
          <div className="uc-session-badges">
            <span className={`uc-badge ${SESSION_STATUS_BADGES[session.status]}`}>
              {session.status === 'OPEN' ? (
                <span className="uc-badge-dot" aria-hidden="true" />
              ) : SESSION_STATUS_ICONS[session.status] ? (
                <span
                  className={`uc-icon ${SESSION_STATUS_ICONS[session.status]}`}
                  aria-hidden="true"
                />
              ) : null}
              {SESSION_STATUS_LABELS[session.status]}
            </span>

            {open ? (
              <span
                className={`uc-live${reconnecting ? ' is-reconnecting' : ''}`}
                role="status"
                title="Atualiza a cada 3 segundos"
              >
                <span className="uc-live-dot" aria-hidden="true" />
                {reconnecting ? 'Reconectando' : 'Ao vivo'}
              </span>
            ) : null}

            {session.openedAt ? (
              <span className="uc-session-openedat">
                Aberta às {formatTimeWithSeconds(session.openedAt)}
              </span>
            ) : null}
          </div>
        </div>

        {open ? (
          <div className="uc-session-actions">
            <button
              className="uc-btn uc-btn-secondary"
              type="button"
              onClick={() => setProjecting(true)}
              disabled={!live.data?.qr}
            >
              <span className="uc-icon uc-i-projector" aria-hidden="true" />
              Projetar QR
            </button>
            <button
              className="uc-btn uc-btn-primary"
              type="button"
              onClick={() => setConfirmingClose(true)}
            >
              <span className="uc-icon uc-i-lock" aria-hidden="true" />
              Encerrar chamada
            </button>
          </div>
        ) : null}

        {open && live.data?.qr ? (
          <div data-theme="light" style={{ flex: 'none' }}>
            <QrFrame qr={live.data.qr} size={136} compact />
          </div>
        ) : null}
      </header>

      {open && session.latitude === null ? (
        <section className="uc-banner uc-banner-warning" aria-label="Sem localização de referência">
          <span className="uc-icon uc-i-map-pin-off" aria-hidden="true" />
          <div className="uc-banner-body">
            <p className="uc-banner-title">Chamada aberta sem localização</p>
            <p>
              A verificação de distância fica desligada nesta chamada. Os registros continuam
              valendo.
            </p>
          </div>
        </section>
      ) : null}

      <div className="uc-stat-row">
        <div className="uc-card uc-stat">
          <span className="uc-stat-label">
            <span className="uc-stat-dot" aria-hidden="true" />
            Matriculados
          </span>
          <span className="uc-stat-value">{summary?.enrolled ?? 0}</span>
          <span className="uc-stat-meta">Matrículas ativas</span>
        </div>
        <div className="uc-card uc-stat">
          <span className="uc-stat-label">
            <span className="uc-stat-dot uc-stat-dot-success" aria-hidden="true" />
            Presentes
          </span>
          <span className="uc-stat-value">{summary?.present ?? 0}</span>
          <span className="uc-stat-meta">
            {summary && summary.enrolled > 0
              ? `${Math.round((summary.present / summary.enrolled) * 100)}% da turma`
              : EMPTY}
          </span>
        </div>
        <div className="uc-card uc-stat">
          <span className="uc-stat-label">
            <span className="uc-stat-dot uc-stat-dot-danger" aria-hidden="true" />
            Ausentes
          </span>
          <span className="uc-stat-value">{summary?.absent ?? 0}</span>
          <span className="uc-stat-meta">Até agora</span>
        </div>
        <div className="uc-card uc-stat">
          <span className="uc-stat-label">
            <span className="uc-stat-dot uc-stat-dot-warning" aria-hidden="true" />
            Com aviso
          </span>
          <span className="uc-stat-value">{counts.flagged}</span>
          <span className="uc-stat-meta">Não bloqueiam a presença</span>
        </div>
      </div>

      <section className="uc-card" aria-label="Alunos da chamada" style={{ overflow: 'hidden' }}>
        <div className="uc-session-toolbar">
          <div className="uc-tabs" role="tablist" aria-label="Filtrar alunos">
            {TABS.map((entry) => (
              <button
                key={entry}
                className="uc-tab"
                role="tab"
                type="button"
                aria-selected={tab === entry}
                onClick={() => setTab(entry)}
              >
                {TAB_LABELS[entry]} <span className="uc-tab-count">{counts[entry]}</span>
              </button>
            ))}
          </div>
          <div className="uc-session-search">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome ou RA"
              label="Buscar aluno"
            />
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="uc-empty">
            <span className="uc-empty-icon">
              <span className="uc-icon uc-icon-lg uc-i-scan-line" aria-hidden="true" />
            </span>
            <h2 className="uc-empty-title">Nenhuma presença ainda</h2>
            <p className="uc-empty-body">
              Projete o QR para a turma começar a registrar. A lista preenche sozinha.
            </p>
            {open ? (
              <div className="uc-empty-actions">
                <button
                  className="uc-btn uc-btn-primary"
                  type="button"
                  onClick={() => setProjecting(true)}
                  disabled={!live.data?.qr}
                >
                  <span className="uc-icon uc-i-projector" aria-hidden="true" />
                  Projetar QR
                </button>
              </div>
            ) : null}
          </div>
        ) : visible.length === 0 ? (
          <div className="uc-empty">
            <span className="uc-empty-icon">
              <span className="uc-icon uc-icon-lg uc-i-search-x" aria-hidden="true" />
            </span>
            <h2 className="uc-empty-title">Nenhum aluno neste filtro</h2>
            <p className="uc-empty-body">Troque a aba ou limpe a busca.</p>
          </div>
        ) : (
          <div className="uc-table-wrap uc-card-table-wrap">
            <table className="uc-table">
              <thead>
                <tr>
                  <th scope="col">Aluno</th>
                  <th scope="col">RA</th>
                  <th scope="col">Horário</th>
                  <th scope="col">Método</th>
                  <th scope="col">Avisos</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => (
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
                    <td className={entry.recordedAt ? undefined : 'uc-cell-muted'}>
                      {entry.recordedAt ? formatTimeWithSeconds(entry.recordedAt) : EMPTY}
                    </td>
                    <td>
                      {entry.method ? (
                        <span className="uc-badge uc-badge-neutral">
                          <span
                            className={`uc-icon ${METHOD_ICONS[entry.method]}`}
                            aria-hidden="true"
                          />
                          {METHOD_LABELS[entry.method]}
                        </span>
                      ) : (
                        <span className="uc-subtle">{EMPTY}</span>
                      )}
                    </td>
                    <td>
                      <AttendanceFlagList flags={entry.flags} distanceM={entry.distanceM} />
                    </td>
                    <td>
                      <span
                        className={`uc-badge ${
                          entry.status === 'PRESENT' ? 'uc-badge-success' : 'uc-badge-danger'
                        }`}
                      >
                        <span
                          className={`uc-icon ${
                            entry.status === 'PRESENT' ? 'uc-i-check' : 'uc-i-x'
                          }`}
                          aria-hidden="true"
                        />
                        {entry.status === 'PRESENT' ? 'Presente' : 'Ausente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          Excluir chamada
        </button>
      </div>

      {confirmingDelete ? (
        <ConfirmModal
          title="Excluir esta chamada?"
          description={
            session.status === 'CONFIRMED'
              ? `A chamada e as ${summary?.present ?? 0} presenças dela saem do sistema, e a frequência de quem estava presente cai junto. Não dá para desfazer.`
              : `A chamada e as ${summary?.present ?? 0} presenças registradas nela saem do sistema. Não dá para desfazer.`
          }
          confirmLabel="Excluir chamada"
          cancelLabel="Manter chamada"
          busy={remove.isPending}
          onConfirm={onDelete}
          onClose={() => setConfirmingDelete(false)}
        />
      ) : null}

      {confirmingClose ? (
        <ConfirmModal
          title="Encerrar a chamada?"
          description={`${summary?.present ?? 0} de ${summary?.enrolled ?? 0} alunos registraram presença. Depois de encerrada, o QR para de valer e ninguém mais consegue registrar.`}
          confirmLabel="Encerrar chamada"
          cancelLabel="Continuar aberta"
          tone="default"
          busy={close.isPending}
          onConfirm={onClose}
          onClose={() => setConfirmingClose(false)}
        />
      ) : null}
    </>
  )
}
