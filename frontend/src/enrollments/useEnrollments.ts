import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { courseKeys } from '@/courses/useCourses'
import {
  dropEnrollment,
  enrollFromUnifesp,
  enrollStudent,
  listEnrollments,
  updateEnrollment,
  type EnrollmentStatus,
  type ManualStudentInput,
} from './enrollments.api'

export const enrollmentKeys = {
  byCourse: (courseId: string, page: number, query: string) =>
    ['enrollments', courseId, page, query] as const,
  anyOf: (courseId: string) => ['enrollments', courseId] as const,
}

export function useEnrollments(courseId: string | undefined, page: number, query: string) {
  return useQuery({
    queryKey: enrollmentKeys.byCourse(courseId ?? '', page, query),
    queryFn: () => listEnrollments(courseId!, { page, query: query || undefined }),
    enabled: Boolean(courseId),
    placeholderData: (previous) => previous,
  })
}

/** Toda escrita na lista muda a contagem de matriculados, que a lateral e os
 *  cartões de turma mostram: as duas consultas caem juntas. */
function useRosterMutation<TVariables, TResult>(
  courseId: string,
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.anyOf(courseId) })
      void queryClient.invalidateQueries({ queryKey: courseKeys.all })
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) })
    },
  })
}

export function useEnrollStudent(courseId: string) {
  return useRosterMutation(courseId, (body: ManualStudentInput) => enrollStudent(courseId, body))
}

export function useEnrollFromUnifesp(courseId: string) {
  return useRosterMutation(courseId, (body: { handle: string; name?: string; email?: string }) =>
    enrollFromUnifesp(courseId, body),
  )
}

export function useUpdateEnrollment(courseId: string) {
  return useRosterMutation(
    courseId,
    ({
      studentId,
      ...body
    }: {
      studentId: string
      name?: string
      email?: string | null
      entryYear?: number | null
      status?: EnrollmentStatus
    }) => updateEnrollment(courseId, studentId, body),
  )
}

export function useDropEnrollment(courseId: string) {
  return useRosterMutation(courseId, (studentId: string) => dropEnrollment(courseId, studentId))
}
