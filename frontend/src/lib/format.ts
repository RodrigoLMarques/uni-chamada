/** Formatos fixos do design system. Mantidos num lugar só para a mesma data não
 *  sair escrita de dois jeitos em telas diferentes. */

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

/** DD/MM, com o ano só quando não é o atual. */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return sameYear ? DATE.format(date) : DATE_WITH_YEAR.format(date)
}

/** HH:MM, para horário de aula. */
export function formatTime(iso: string): string {
  return TIME.format(new Date(iso))
}

/** HH:MM:SS, para horário de registro na lista. */
export function formatTimeWithSeconds(iso: string): string {
  return TIME_WITH_SECONDS.format(new Date(iso))
}

/** Falta de dado é travessão, nunca zero nem vazio. */
export const EMPTY = '—'
