import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api'
import { INSTITUTIONS } from '@/courses/courses.api'

export const institutionSchema = z.object({
  id: z.enum(INSTITUTIONS),
  name: z.string(),
  /** Falso quando o backend está sem credenciais da Unifesp: aí o modal cai no
   *  cadastro manual em vez de oferecer uma busca que vai falhar. */
  autofill: z.boolean(),
})

export type InstitutionOption = z.infer<typeof institutionSchema>

/** A busca não traz foto nem ano de ingresso: os dois vêm do perfil, que o
 *  backend só consulta ao criar a matrícula. */
export const institutionStudentSchema = z.object({
  name: z.string(),
  ra: z.string().nullable(),
  email: z.string().nullable(),
  maskedCpf: z.string().nullable(),
  handle: z.string(),
})

export type InstitutionStudent = z.infer<typeof institutionStudentSchema>

export const UNIFESP_QUERY_MIN_LENGTH = 5

export function listInstitutions() {
  return api.request('/institutions', { schema: z.array(institutionSchema) })
}

export function searchUnifespStudents(query: string, signal?: AbortSignal) {
  return api.request(`/institutions/unifesp/students?query=${encodeURIComponent(query)}`, {
    schema: z.array(institutionStudentSchema),
    signal,
  })
}

export function useInstitutions() {
  return useQuery({
    queryKey: ['institutions'],
    queryFn: listInstitutions,
    staleTime: 10 * 60 * 1000,
  })
}
