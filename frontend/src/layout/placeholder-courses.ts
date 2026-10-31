/** Turmas estáticas só para a lateral ter conteúdo enquanto a listagem real não
 *  existe. A task 11 substitui isto pela consulta a GET /courses e apaga o arquivo.
 *  Os dados são os mesmos dos artboards do canvas. */

export type PlaceholderCourse = {
  slug: string
  name: string
  hasOpenSession: boolean
}

export const PLACEHOLDER_COURSES: PlaceholderCourse[] = [
  { slug: 'mat-202-a', name: 'Cálculo II', hasOpenSession: true },
  { slug: 'mat-118-b', name: 'Álgebra Linear', hasOpenSession: false },
  { slug: 'mat-104-a', name: 'Geometria Analítica', hasOpenSession: false },
]
