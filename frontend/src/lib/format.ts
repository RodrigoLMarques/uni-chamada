
const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const DATE_WITH_YEAR = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const TIME_WITH_SECONDS = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function formatDate(iso: string): string {
  const date = new Date(iso)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return sameYear ? DATE.format(date) : DATE_WITH_YEAR.format(date)
}

export function formatTime(iso: string): string {
  return TIME.format(new Date(iso))
}

export function formatTimeWithSeconds(iso: string): string {
  return TIME_WITH_SECONDS.format(new Date(iso))
}

export const EMPTY = '—'

export function formatDistance(distanceM: number | null): string | null {
  if (distanceM === null) return null
  if (distanceM < 1000) return `${Math.round(distanceM)} m`
  return `${(distanceM / 1000).toFixed(1).replace('.', ',')} km`
}
