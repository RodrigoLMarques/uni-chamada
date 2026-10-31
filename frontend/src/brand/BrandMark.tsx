/** A sala vista de cima: lugares ocupados e vazios.
 *
 *  Grade de 4 por 3, mais larga que alta para não virar ícone genérico de "apps".
 *  O que separa a marca de uma grade qualquer é a mistura de cheio e vazio, então
 *  a célula vazia é contorno e nunca um preenchimento mais claro — a marca precisa
 *  funcionar em uma cor só, sem opacidade. */

type Cell = { column: number; row: number }

const COLUMNS = 4
const ROWS = 3

/** Uma vazia por linha, em colunas distintas e nenhuma nos cantos, para o contorno
 *  geral continuar um retângulo firme. */
const EMPTY_CELLS: Cell[] = [
  { column: 1, row: 0 },
  { column: 3, row: 1 },
  { column: 2, row: 2 },
]

const COMPACT_COLUMNS = 3
const COMPACT_ROWS = 2
const COMPACT_EMPTY: Cell = { column: 2, row: 0 }

function isEmpty(cells: Cell[], column: number, row: number): boolean {
  return cells.some((cell) => cell.column === column && cell.row === row)
}

type GridOptions = {
  columns: number
  rows: number
  empty: Cell[]
  cell: number
  gap: number
  offsetX?: number
  offsetY?: number
  /** Abaixo de ~24px um contorno de 1px num quadrado de 4px não sobrevive:
   *  a célula vazia vira lacuna, sem nada desenhado. */
  emptyAsGap?: boolean
}

function gridCells({
  columns,
  rows,
  empty,
  cell,
  gap,
  offsetX = 0,
  offsetY = 0,
  emptyAsGap = false,
}: GridOptions) {
  const step = cell + gap
  const stroke = Math.max(1, Math.round(cell / 6))
  const inset = stroke / 2
  const nodes = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const key = `${column}-${row}`
      const x = offsetX + column * step
      const y = offsetY + row * step

      if (isEmpty(empty, column, row)) {
        if (emptyAsGap) continue
        nodes.push(
          <rect
            key={key}
            x={x + inset}
            y={y + inset}
            width={cell - stroke}
            height={cell - stroke}
            rx={cell / 4}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
          />,
        )
        continue
      }

      nodes.push(
        <rect
          key={key}
          x={x}
          y={y}
          width={cell}
          height={cell}
          rx={cell / 4}
          fill="currentColor"
        />,
      )
    }
  }

  return nodes
}

type MarkProps = {
  /** Altura em px. Abaixo de 24 a marca troca para a grade compacta. */
  size?: number
  /** Nome acessível. Sem ele a marca é decorativa e fica escondida do leitor de tela. */
  title?: string
  className?: string
}

export function BrandMark({ size = 32, title, className }: MarkProps) {
  const compact = size < 24
  const columns = compact ? COMPACT_COLUMNS : COLUMNS
  const rows = compact ? COMPACT_ROWS : ROWS
  const cell = 12
  const gap = 4
  const width = columns * cell + (columns - 1) * gap
  const height = rows * cell + (rows - 1) * gap

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={(size * width) / height}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {gridCells({
        columns,
        rows,
        empty: compact ? [COMPACT_EMPTY] : EMPTY_CELLS,
        cell,
        gap,
        emptyAsGap: compact,
      })}
    </svg>
  )
}

/** Quadrado arredondado com a grade vazada, para favicon e ícone de aplicativo. */
export function BrandTile({ size = 40, title, className }: MarkProps) {
  const cell = 10
  const gap = 2

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <rect width="64" height="64" rx="14" fill="var(--accent)" />
      {/* currentColor dentro do tile é a cor do ícone, não a do texto ao redor. */}
      <g style={{ color: 'var(--accent-fg)' }}>
        {gridCells({
          columns: COLUMNS,
          rows: ROWS,
          empty: EMPTY_CELLS,
          cell,
          gap,
          offsetX: 9,
          offsetY: 15,
        })}
      </g>
    </svg>
  )
}
