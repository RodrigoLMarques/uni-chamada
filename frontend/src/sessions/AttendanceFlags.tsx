import { formatDistance } from '@/lib/format'
import type { AttendanceFlags as Flags } from './live.api'

/** Ordem fixa do design system. São AVISOS: nada de vermelho, e as palavras
 *  "fraude", "suspeito" e "irregular" não entram em lugar nenhum. */
function describe(flags: Flags, distanceM: number | null) {
  const entries: { key: string; className: string; icon: string; label: string; title: string }[] =
    []

  if (flags.noLocation) {
    entries.push({
      key: 'noLocation',
      className: 'uc-flag-nolocation',
      icon: 'uc-i-map-pin-off',
      label: 'Sem localização',
      title: 'O aluno não permitiu a localização no celular.',
    })
  }

  if (flags.farFromTeacher) {
    const distance = formatDistance(distanceM)
    entries.push({
      key: 'farFromTeacher',
      className: 'uc-flag-far',
      icon: 'uc-i-ruler',
      label: distance ? `A ${distance}` : 'Longe',
      title: distance
        ? `Registro a ${distance} do ponto onde a chamada foi aberta.`
        : 'Registro longe do ponto onde a chamada foi aberta.',
    })
  }

  if (flags.sharedDevice) {
    entries.push({
      key: 'sharedDevice',
      className: 'uc-flag-shared',
      icon: 'uc-i-smartphone',
      label: 'Mesmo aparelho',
      title: 'Este celular também registrou outro RA nesta chamada.',
    })
  }

  return entries
}

export function AttendanceFlagList({
  flags,
  distanceM,
  compact = true,
}: {
  flags: Flags | null
  distanceM: number | null
  compact?: boolean
}) {
  const entries = flags ? describe(flags, distanceM) : []

  if (entries.length === 0) {
    return (
      <span className="uc-subtle" aria-label="Sem avisos">
        —
      </span>
    )
  }

  return (
    <div className="uc-flags">
      {entries.map((entry) => (
        // Botão, não span: é o que deixa o tooltip alcançável pelo teclado.
        <button
          key={entry.key}
          type="button"
          className={`uc-flag ${compact ? 'uc-flag-compact' : ''} ${entry.className}`}
          title={entry.title}
          aria-label={entry.label}
        >
          <span className={`uc-icon ${entry.icon}`} aria-hidden="true" />
          {entry.key === 'farFromTeacher' ? formatDistance(distanceM) : null}
          {compact ? null : entry.label}
        </button>
      ))}
    </div>
  )
}
