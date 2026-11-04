import { useEffect, useRef, useState } from 'react'
import type { QrToken } from './live.api'
import { QrFrame } from './QrFrame'

const CONTROLS_IDLE_MS = 3000
const QR_SIZE_PX = 780

/** Tela cheia do próprio painel, não página separada. Sempre clara, em qualquer
 *  tema do sistema: leitor de QR espera módulo escuro sobre fundo claro, e
 *  código invertido falha em parte dos aparelhos. */
export function ProjectionView({
  courseName,
  courseLabel,
  qr,
  presentCount,
  onExit,
}: {
  courseName: string
  courseLabel: string
  qr: QrToken | null
  presentCount: number
  onExit: () => void
}) {
  const [pointerActive, setPointerActive] = useState(true)
  const idleTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    function wake() {
      setPointerActive(true)
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => setPointerActive(false), CONTROLS_IDLE_MS)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onExit()
      else wake()
    }

    wake()
    window.addEventListener('pointermove', wake)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(idleTimer.current)
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onExit])

  return (
    <main
      className={`uc-projection uc-projection-screen${pointerActive ? ' is-pointer-active' : ''}`}
      data-theme="light"
      aria-label={`Projeção da chamada de ${courseLabel}`}
    >
      <div className="uc-projection-qr">
        {qr ? (
          <QrFrame qr={qr} size={QR_SIZE_PX} />
        ) : (
          <p className="uc-projection-instruction">Preparando o código…</p>
        )}
      </div>

      <div className="uc-projection-side">
        <p className="uc-projection-course">{courseName}</p>
        <p className="uc-projection-instruction">Escaneie e digite seu RA</p>
        {/* A contagem troca o número sem animação: a projeção não tem movimento. */}
        <p className="uc-projection-count" role="status">
          <span className="uc-projection-count-value">{presentCount}</span>
          <span className="uc-projection-count-label">
            {presentCount === 1 ? 'presente' : 'presentes'}
          </span>
        </p>
      </div>

      <div className="uc-projection-controls" role="toolbar" aria-label="Controles da projeção">
        <span className="uc-projection-hint">
          <kbd>Esc</kbd> também sai
        </span>
        <button
          className="uc-btn uc-btn-secondary uc-btn-projection"
          type="button"
          onClick={onExit}
        >
          Sair da projeção
        </button>
      </div>
    </main>
  )
}
