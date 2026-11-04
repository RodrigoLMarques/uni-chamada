import { useEffect, useState } from 'react'
import type { QrToken } from './live.api'
import { QrCode } from './QrCode'
import { scanUrlFor } from './scan-url'

function secondsLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
}

function useTick(intervalMs: number): void {
  const [, setTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
}

export function QrFrame({
  qr,
  size,
  compact = false,
}: {
  qr: QrToken
  size: number
  compact?: boolean
}) {
  useTick(250)
  const left = secondsLeft(qr.expiresAt)
  const total = Math.max(1, qr.windowSeconds)
  const filled = Math.min(total, Math.max(0, total - left))

  return (
    <figure
      className={compact ? 'uc-qr uc-qr-sm' : 'uc-qr'}
      style={{ margin: 0 }}
      aria-label={`QR code da chamada, renova a cada ${total} segundos`}
    >
      {/* O path é substituído, nunca o elemento: trocar o <svg> inteiro pisca na
          projeção, e a regra do sistema é zero movimento aqui. */}
      <QrCode value={scanUrlFor(qr.token)} size={size} label="QR code da chamada" />
      <figcaption className="uc-qr-caption">
        <span className="uc-qr-timer" aria-hidden="true">
          <span className="uc-qr-steps">
            {Array.from({ length: total }, (_, index) => (
              <i key={index} className={index < filled ? 'on' : undefined} />
            ))}
          </span>
          renova em {left} s
        </span>
      </figcaption>
    </figure>
  )
}
