import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api'
import { paginationMetaSchema, searchParams } from '@/lib/pagination'

export const courseReportSchema = z.object({
  data: z.array(
    z.object({
      student: z.object({
        id: z.string(),
        ra: z.string(),
        name: z.string(),
        photoUrl: z.string().nullable(),
      }),
      attendedSessions: z.number(),
      attendanceRate: z.number().nullable(),
    }),
  ),
  pagination: paginationMetaSchema,
  summary: z.object({
    students: z.number(),
    confirmedSessions: z.number(),
    pendingSessions: z.number(),
  }),
})

export type CourseReport = z.infer<typeof courseReportSchema>
export type CourseReportEntry = CourseReport['data'][number]

export function getCourseReport(
  courseId: string,
  params: { page?: number; query?: string } = {},
) {
  return api.request(`/courses/${courseId}/report${searchParams(params)}`, {
    schema: courseReportSchema,
  })
}

export function useCourseReport(courseId: string | undefined, page: number, query: string) {
  return useQuery({
    queryKey: ['report', courseId ?? '', page, query],
    queryFn: () => getCourseReport(courseId!, { page, query: query || undefined }),
    enabled: Boolean(courseId),
    placeholderData: (previous) => previous,
  })
}
