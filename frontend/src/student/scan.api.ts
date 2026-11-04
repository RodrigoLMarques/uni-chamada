import { z } from 'zod'
import { api, ApiError, NetworkError } from '@/lib/api'
import { COURSE_PERIODS } from '@/courses/courses.api'

export const scanContextSchema = z.object({
  ticket: z.string(),
  ticketExpiresAt: z.string(),
  course: z.object({
    name: z.string(),
    code: z.string(),
    term: z.string(),
    period: z.enum(COURSE_PERIODS),
  }),
  teacherName: z.string(),
  openedAt: z.string(),
})

export type ScanContext = z.infer<typeof scanContextSchema>

export const scanResponseSchema = z.object({
  status: z.literal('RECORDED'),
  studentName: z.string(),
  recordedAt: z.string(),
  deviceToken: z.string().optional(),
})

export type ScanResponse = z.infer<typeof scanResponseSchema>

export type ScanInput = {
  token: string
  ra: string
  deviceToken?: string
  latitude?: number
  longitude?: number
  accuracyM?: number
}

export function getScanContext(token: string, signal?: AbortSignal) {
  return api.request(`/scan/${encodeURIComponent(token)}`, {
    schema: scanContextSchema,
    anonymous: true,
    signal,
  })
}

export function scan(body: ScanInput) {
  return api.request('/scan', {
    method: 'POST',
    body,
    schema: scanResponseSchema,
    anonymous: true,
  })
}

export type ScanFailure =
  | 'expired'
  | 'notEnrolled'
  | 'alreadyRegistered'
  | 'sessionClosed'
  | 'rateLimited'
  | 'offline'
  | 'unknown'

export function failureOf(error: unknown): ScanFailure {
  if (error instanceof NetworkError) return 'offline'
  if (!(error instanceof ApiError)) return 'unknown'
  if (error.isRateLimited) return 'rateLimited'
  if (error.status === 401) return 'expired'
  if (error.status === 403) return 'notEnrolled'
  if (error.status === 409) {
    return error.messages.some((message) => message.includes('already'))
      ? 'alreadyRegistered'
      : 'sessionClosed'
  }
  return 'unknown'
}
