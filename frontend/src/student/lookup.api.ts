import { z } from 'zod'
import { api, ApiError } from '@/lib/api'
import { COURSE_PERIODS } from '@/courses/courses.api'

export const MINIMUM_ATTENDANCE_RATE = 75

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

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}
