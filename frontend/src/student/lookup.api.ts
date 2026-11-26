import { z } from 'zod'
import { api, ApiError } from '@/lib/api'
import { COURSE_PERIODS } from '@/courses/courses.api'

export const studentAttendanceSchema = z.object({
  student: z.object({ ra: z.string(), name: z.string() }),
  courses: z.array(
    z.object({
      course: z.object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
        term: z.string(),
        period: z.enum(COURSE_PERIODS),
      }),
      confirmedSessions: z.number(),
      attendedSessions: z.number(),
      pendingSessions: z.number(),
      attendanceRate: z.number().nullable(),
    }),
  ),
})

export type StudentAttendance = z.infer<typeof studentAttendanceSchema>
export type StudentCourseSummary = StudentAttendance['courses'][number]

export function getStudentAttendance(ra: string, signal?: AbortSignal) {
  return api.request(`/students/${encodeURIComponent(ra)}/attendance`, {
    schema: studentAttendanceSchema,
    anonymous: true,
    signal,
  })
}

export const studentSessionSchema = z.object({
  sessionId: z.string(),
  startsAt: z.string(),
  status: z.enum(['PRESENT', 'ABSENT']),
  confirmed: z.boolean(),
  method: z.enum(['QR', 'MANUAL']).nullable(),
  recordedAt: z.string().nullable(),
})

export type StudentSession = z.infer<typeof studentSessionSchema>

export const studentSessionsSchema = z.object({
  data: z.array(studentSessionSchema),
  pagination: z.object({
    page: z.number(),
    itemsPerPage: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
})

export type StudentSessions = z.infer<typeof studentSessionsSchema>

export function getStudentCourseSessions(
  ra: string,
  courseId: string,
  page: number,
  signal?: AbortSignal,
) {
  return api.request(
    `/students/${encodeURIComponent(ra)}/courses/${courseId}/attendance?page=${page}&itemsPerPage=100`,
    { schema: studentSessionsSchema, anonymous: true, signal },
  )
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}
