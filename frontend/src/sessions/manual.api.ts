import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { courseKeys } from '@/courses/useCourses'
import { api } from '@/lib/api'
import { liveKeys } from './useLiveSession'
import { classSessionSchema, sessionKeys } from './sessions.api'

export const BULK_LIMIT = 200

export const SKIP_REASONS = ['NOT_ENROLLED', 'ALREADY_REGISTERED'] as const

export type SkipReason = (typeof SKIP_REASONS)[number]

export const bulkResultSchema = z.object({
  recorded: z.array(z.string()),
  skipped: z.array(z.object({ ra: z.string(), reason: z.enum(SKIP_REASONS) })),
})

export type BulkResult = z.infer<typeof bulkResultSchema>

export function recordManual(courseId: string, sessionId: string, ra: string) {
  return api.request(`/courses/${courseId}/sessions/${sessionId}/attendance`, {
    method: 'POST',
    body: { ra },
  })
}

export function recordManualBulk(courseId: string, sessionId: string, ras: string[]) {
  return api.request(`/courses/${courseId}/sessions/${sessionId}/attendance/bulk`, {
    method: 'POST',
    body: { ras },
    schema: bulkResultSchema,
  })
}

export function removeAttendance(courseId: string, sessionId: string, studentId: string) {
  return api.request(`/courses/${courseId}/sessions/${sessionId}/attendance/${studentId}`, {
    method: 'DELETE',
  })
}

export function confirmSession(courseId: string, sessionId: string) {
  return api.request(`/courses/${courseId}/sessions/${sessionId}/confirm`, {
    method: 'POST',
    schema: classSessionSchema,
  })
}

/** Separa por quebra de linha, vírgula ou espaço e descarta o que não for
 *  dígito, para colar de planilha funcionar. */
export function parseRaList(raw: string): string[] {
  const seen = new Set<string>()
  for (const chunk of raw.split(/[\s,;]+/)) {
    const digits = chunk.replace(/\D/g, '')
    if (digits) seen.add(digits)
  }
  return [...seen]
}

function useSessionWrite<TVariables, TResult>(
  courseId: string,
  sessionId: string,
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: liveKeys.roll(courseId, sessionId) })
      void queryClient.invalidateQueries({ queryKey: liveKeys.live(courseId, sessionId) })
      void queryClient.invalidateQueries({ queryKey: ['session', courseId, sessionId] })
      void queryClient.invalidateQueries({ queryKey: sessionKeys.byCourse(courseId) })
      void queryClient.invalidateQueries({ queryKey: courseKeys.all })
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) })
    },
  })
}

export function useRecordManual(courseId: string, sessionId: string) {
  return useSessionWrite(courseId, sessionId, (ra: string) =>
    recordManual(courseId, sessionId, ra),
  )
}

export function useRecordManualBulk(courseId: string, sessionId: string) {
  return useSessionWrite(courseId, sessionId, (ras: string[]) =>
    recordManualBulk(courseId, sessionId, ras),
  )
}

export function useRemoveAttendance(courseId: string, sessionId: string) {
  return useSessionWrite(courseId, sessionId, (studentId: string) =>
    removeAttendance(courseId, sessionId, studentId),
  )
}

export function useConfirmSession(courseId: string, sessionId: string) {
  return useSessionWrite(courseId, sessionId, () => confirmSession(courseId, sessionId))
}
