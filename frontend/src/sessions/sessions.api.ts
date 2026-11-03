import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api'
import { paginatedSchema, searchParams } from '@/lib/pagination'

/** SCHEDULED existe no enum da API mas não acontece no MVP: a chamada nasce
 *  aberta. Nenhuma tela trata esse estado. */
export const SESSION_STATUSES = ['SCHEDULED', 'OPEN', 'CLOSED', 'CONFIRMED'] as const

export type SessionStatus = (typeof SESSION_STATUSES)[number]

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  SCHEDULED: 'Agendada',
  OPEN: 'Aberta',
  CLOSED: 'Encerrada',
  CONFIRMED: 'Confirmada',
}

export const SESSION_STATUS_BADGES: Record<SessionStatus, string> = {
  SCHEDULED: 'uc-badge-neutral',
  OPEN: 'uc-badge-inverse',
  CLOSED: 'uc-badge-warning',
  CONFIRMED: 'uc-badge-success',
}

export const SESSION_STATUS_ICONS: Record<SessionStatus, string | null> = {
  SCHEDULED: 'uc-i-calendar-clock',
  OPEN: null,
  CLOSED: 'uc-i-lock',
  CONFIRMED: 'uc-i-check-check',
}

export const classSessionSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  startsAt: z.string(),
  openedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  confirmedAt: z.string().nullable(),
  status: z.enum(SESSION_STATUSES),
  presentCount: z.number(),
})

export type ClassSession = z.infer<typeof classSessionSchema>

export function listSessions(courseId: string, params: { page?: number } = {}) {
  return api.request(`/courses/${courseId}/sessions${searchParams(params)}`, {
    schema: paginatedSchema(classSessionSchema),
  })
}

export const sessionKeys = {
  byCourse: (courseId: string) => ['sessions', courseId] as const,
}

export function useSessions(courseId: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.byCourse(courseId ?? ''),
    queryFn: () => listSessions(courseId!),
    enabled: Boolean(courseId),
    select: (result) => result.data,
  })
}
