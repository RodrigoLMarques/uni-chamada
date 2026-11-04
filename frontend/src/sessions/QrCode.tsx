import QRCode from 'qrcode'
import { useMemo } from 'react'

const QUIET_ZONE = 4

type Modules = ReturnType<typeof QRCode.create>['modules']

function pathFor(modules: Modules): string {
  const parts: string[] = []

  for (let row = 0; row < modules.size; row += 1) {
    let runStart: number | null = null

    for (let column = 0; column <= modules.size; column += 1) {
      const dark = column < modules.size && Boolean(modules.get(row, column))
      if (dark && runStart === null) runStart = column
      if (!dark && runStart !== null) {
        parts.push(`M${runStart} ${row}h${column - runStart}v1h-${column - runStart}z`)
        runStart = null
      }
    }
  }

  return parts.join('')
}

export function QrCode({ token, size, label }: { token: string; size: number; label: string }) {
  const { path, span } = useMemo(() => {
    const qr = QRCode.create(token, { errorCorrectionLevel: 'M' })
    return { path: pathFor(qr.modules), span: qr.modules.size + QUIET_ZONE * 2 }
  }, [token])

  return (
    <svg
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${span} ${span}`}
      role="img"
      aria-label={label}
      style={{ width: `${size}px`, height: `${size}px`, shapeRendering: 'crispEdges' }}
    >
      <path d={path} fill="var(--qr-ink)" />
    </svg>
  )
}
