import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCourse,
  deleteCourse,
  getCourse,
  listCourses,
  updateCourse,
  type CourseInput,
} from './courses.api'

export const courseKeys = {
  all: ['courses'] as const,
  detail: (courseId: string) => ['courses', courseId] as const,
}

/** Uma consulta só alimenta a lateral e a tela inicial. */
export function useCourses() {
  return useQuery({
    queryKey: courseKeys.all,
    queryFn: () => listCourses(),
    select: (result) => result.data,
  })
}

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: courseKeys.detail(courseId ?? ''),
    queryFn: () => getCourse(courseId!),
    enabled: Boolean(courseId),
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CourseInput) => createCourse(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.all }),
  })
}

export function useUpdateCourse(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<CourseInput>) => updateCourse(courseId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.all })
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) })
    },
  })
}

export function useDeleteCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (courseId: string) => deleteCourse(courseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.all }),
  })
}
