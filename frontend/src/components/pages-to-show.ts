/** Mais de 7 páginas: primeira, vizinhas da atual, reticências e última. */
export function pagesToShow(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)

  const withGaps: (number | 'gap')[] = []
  let previous = 0
  for (const page of sorted) {
    if (previous && page - previous > 1) withGaps.push('gap')
    withGaps.push(page)
    previous = page
  }
  return withGaps
}
