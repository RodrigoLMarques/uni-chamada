import { z } from 'zod'

export const paginationMetaSchema = z.object({
  page: z.number(),
  itemsPerPage: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
})

export type PaginationMeta = z.infer<typeof paginationMetaSchema>

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), pagination: paginationMetaSchema })
}

export function searchParams(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}
