import { z } from 'zod'
import { api } from '@/lib/api'
import { paginationMetaSchema, searchParams } from '@/lib/pagination'
import { SESSION_STATUSES } from './sessions.api'

export const ATTENDANCE_METHODS = ['QR', 'MANUAL'] as const
export const ROLL_STATUSES = ['PRESENT', 'ABSENT'] as const

export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[number]
export type RollStatus = (typeof ROLL_STATUSES)[number]

export const METHOD_LABELS: Record<AttendanceMethod, string> = {
  QR: 'QR code',
  MANUAL: 'Manual',
}

export const METHOD_ICONS: Record<AttendanceMethod, string> = {
  QR: 'uc-i-qr-code',
  MANUAL: 'uc-i-pencil',
}

export const qrTokenSchema = z.object({
  token: z.string(),
  windowSeconds: z.number(),
  expiresAt: z.string(),
})

export type QrToken = z.infer<typeof qrTokenSchema>

const summarySchema = z.object({
  enrolled: z.number(),
  present: z.number(),
  absent: z.number(),
})

export type RollSummary = z.infer<typeof summarySchema>

export const liveSessionSchema = z.object({
  status: z.enum(SESSION_STATUSES),
  qr: qrTokenSchema.nullable(),
  summary: summarySchema,
  lastRecordedAt: z.string().nullable(),
  recent: z.array(
    z.object({
      ra: z.string(),
      name: z.string(),
      method: z.enum(ATTENDANCE_METHODS),
      recordedAt: z.string(),
    }),
  ),
})

export type LiveSession = z.infer<typeof liveSessionSchema>

/** As três coexistem no mesmo aluno. São avisos para o professor, nunca bloqueio. */
export const attendanceFlagsSchema = z.object({
  noLocation: z.boolean(),
  farFromTeacher: z.boolean(),
  sharedDevice: z.boolean(),
})

export type AttendanceFlags = z.infer<typeof attendanceFlagsSchema>

export const rollEntrySchema = z.object({
  student: z.object({
    id: z.string(),
    ra: z.string(),
    name: z.string(),
    photoUrl: z.string().nullable(),
  }),
  status: z.enum(ROLL_STATUSES),
  method: z.enum(ATTENDANCE_METHODS).nullable(),
  recordedAt: z.string().nullable(),
  distanceM: z.number().nullable(),
  flags: attendanceFlagsSchema.nullable(),
})

export type RollEntry = z.infer<typeof rollEntrySchema>

export const rollSchema = z.object({
  data: z.array(rollEntrySchema),
  pagination: paginationMetaSchema,
  summary: summarySchema,
})

export function getLive(courseId: string, sessionId: string) {
  return api.request(`/courses/${courseId}/sessions/${sessionId}/live`, {
    schema: liveSessionSchema,
  })
}

/** A turma inteira numa página: o limite da API é 100 e o design system manda
 *  rolar em vez de paginar durante a chamada. */
export const ROLL_PAGE_SIZE = 100

export function getRoll(courseId: string, sessionId: string) {
  return api.request(
    `/courses/${courseId}/sessions/${sessionId}/roll${searchParams({ itemsPerPage: ROLL_PAGE_SIZE })}`,
    { schema: rollSchema },
  )
}

export function getQr(courseId: string, sessionId: string) {
  return api.request(`/courses/${courseId}/sessions/${sessionId}/qr`, { schema: qrTokenSchema })
}

export function hasAnyFlag(flags: AttendanceFlags | null): boolean {
  return Boolean(flags && (flags.noLocation || flags.farFromTeacher || flags.sharedDevice))
}
