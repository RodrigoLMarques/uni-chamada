import { z } from 'zod'
import { api } from '@/lib/api'
import { paginatedSchema, searchParams } from '@/lib/pagination'

export const ENROLLMENT_STATUSES = ['ACTIVE', 'DROPPED'] as const

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: 'Ativa',
  DROPPED: 'Cancelada',
}

export const enrollmentSchema = z.object({
  student: z.object({
    id: z.string(),
    ra: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    photoUrl: z.string().nullable(),
    entryYear: z.number().nullable(),
  }),
  status: z.enum(ENROLLMENT_STATUSES),
  enrolledAt: z.string().nullable(),
})

export type Enrollment = z.infer<typeof enrollmentSchema>

export type ManualStudentInput = {
  ra: string
  name: string
  email?: string
  entryYear?: number
}

export function listEnrollments(
  courseId: string,
  params: { page?: number; query?: string; status?: EnrollmentStatus } = {},
) {
  return api.request(`/courses/${courseId}/enrollments${searchParams(params)}`, {
    schema: paginatedSchema(enrollmentSchema),
  })
}

export function enrollStudent(courseId: string, body: ManualStudentInput) {
  return api.request(`/courses/${courseId}/enrollments`, {
    method: 'POST',
    body,
    schema: enrollmentSchema,
  })
}

/** O `handle` vem da busca. O backend busca o perfil, baixa a foto e guarda,
 *  por isso foto e ano de ingresso só existem depois desta chamada. */
export function enrollFromUnifesp(courseId: string, body: { handle: string; name?: string; email?: string }) {
  return api.request(`/courses/${courseId}/enrollments/from-unifesp`, {
    method: 'POST',
    body,
    schema: enrollmentSchema,
  })
}

export function updateEnrollment(
  courseId: string,
  studentId: string,
  body: Partial<{ name: string; email: string | null; entryYear: number | null; status: EnrollmentStatus }>,
) {
  return api.request(`/courses/${courseId}/enrollments/${studentId}`, {
    method: 'PATCH',
    body,
    schema: enrollmentSchema,
  })
}

export function dropEnrollment(courseId: string, studentId: string) {
  return api.request(`/courses/${courseId}/enrollments/${studentId}`, { method: 'DELETE' })
}
