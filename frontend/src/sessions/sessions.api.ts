import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api'
import { paginatedSchema, searchParams } from '@/lib/pagination'

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
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  accuracyM: z.number().nullable(),
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

export function getSession(courseId: string, sessionId: string) {
  return api.request(`/courses/${courseId}/sessions/${sessionId}`, { schema: classSessionSchema })
}

export function createSession(courseId: string, startsAt: string) {
  return api.request(`/courses/${courseId}/sessions`, {
    method: 'POST',
    body: { startsAt },
    schema: classSessionSchema,
  })
}

export function openSession(
  courseId: string,
  sessionId: string,
  position?: { latitude: number; longitude: number; accuracyM?: number },
) {
  return api.request(`/courses/${courseId}/sessions/${sessionId}/open`, {
    method: 'POST',
    body: position ?? {},
    schema: classSessionSchema,
  })
}

export function closeSession(courseId: string, sessionId: string) {
  return api.request(`/courses/${courseId}/sessions/${sessionId}/close`, {
    method: 'POST',
    schema: classSessionSchema,
  })
}

export function useSession(courseId: string | undefined, sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session', courseId ?? '', sessionId ?? ''],
    queryFn: () => getSession(courseId!, sessionId!),
    enabled: Boolean(courseId && sessionId),
  })
}

export function deleteSession(courseId: string, sessionId: string) {
  return api.request(`/courses/${courseId}/sessions/${sessionId}`, { method: 'DELETE' })
}
