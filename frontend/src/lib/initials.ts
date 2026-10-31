/** Regra do design system: primeira letra do primeiro e do último nome, ignorando
 *  as partículas. "João Pedro da Valença" vira JV. Nome único vira uma letra. */

const PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

export function initialsFrom(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0 && !PARTICLES.has(part.toLowerCase()))

  if (parts.length === 0) return ''

  const first = parts[0]!.charAt(0)
  if (parts.length === 1) return first.toUpperCase()

  return (first + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}
