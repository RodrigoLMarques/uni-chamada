import { z } from 'zod'
import type { ApiClient } from '@/lib/api'

export const teacherSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
})

export type Teacher = z.infer<typeof teacherSchema>

const authResponseSchema = z.object({
  accessToken: z.string(),
  user: teacherSchema,
})

export function login(api: ApiClient, credentials: { email: string; password: string }) {
  return api.request('/auth/login', {
    method: 'POST',
    body: credentials,
    schema: authResponseSchema,
    anonymous: true,
  })
}

export function fetchCurrentTeacher(api: ApiClient, signal?: AbortSignal) {
  return api.request('/auth/me', { schema: teacherSchema, signal })
}

export function updatePassword(
  api: ApiClient,
  body: { currentPassword: string; newPassword: string },
) {
  return api.request('/auth/password', {
    method: 'PUT',
    body,
    schema: z.object({ message: z.string() }),
  })
}

export function updateProfile(api: ApiClient, body: { name?: string; email?: string }) {
  return api.request('/users/me', { method: 'PATCH', body, schema: teacherSchema })
}
