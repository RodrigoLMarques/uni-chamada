import { z } from 'zod'
import { api } from '@/lib/api'
import { paginatedSchema, searchParams } from '@/lib/pagination'

export const COURSE_PERIODS = ['FULL_TIME', 'EVENING'] as const
export const INSTITUTIONS = ['UNIFESP', 'OTHER'] as const

export type CoursePeriod = (typeof COURSE_PERIODS)[number]
export type InstitutionId = (typeof INSTITUTIONS)[number]

export const PERIOD_LABELS: Record<CoursePeriod, string> = {
  FULL_TIME: 'Integral',
  EVENING: 'Noturno',
}

export const INSTITUTION_LABELS: Record<InstitutionId, string> = {
  UNIFESP: 'Unifesp',
  OTHER: 'Outra instituição',
}

export const courseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  term: z.string(),
  period: z.enum(COURSE_PERIODS),
  institution: z.enum(INSTITUTIONS),
  enrolledCount: z.number(),
  lastSessionAt: z.string().nullable(),
  openSessionId: z.string().nullable(),
})

export type Course = z.infer<typeof courseSchema>

export type CourseInput = {
  code: string
  name: string
  term: string
  period: CoursePeriod
  institution: InstitutionId
}

export function listCourses(params: { page?: number; query?: string } = {}) {
  return api.request(`/courses${searchParams({ ...params, itemsPerPage: 100 })}`, {
    schema: paginatedSchema(courseSchema),
  })
}

export function getCourse(courseId: string) {
  return api.request(`/courses/${courseId}`, { schema: courseSchema })
}

export function createCourse(body: CourseInput) {
  return api.request('/courses', { method: 'POST', body, schema: courseSchema })
}

export function updateCourse(courseId: string, body: Partial<CourseInput>) {
  return api.request(`/courses/${courseId}`, { method: 'PATCH', body, schema: courseSchema })
}

export function deleteCourse(courseId: string) {
  return api.request(`/courses/${courseId}`, { method: 'DELETE' })
}
