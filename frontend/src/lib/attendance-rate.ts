export const MINIMUM_ATTENDANCE_RATE = 75

/** A API devolve a frequência como fração de 0 a 1, arredondada em duas casas.
 *  A interface mostra porcentagem inteira, então a conversão mora aqui e em
 *  nenhum outro lugar. */
export function ratePercent(rate: number): number {
  return Math.round(rate * 100)
}

export function isBelowMinimum(rate: number): boolean {
  return ratePercent(rate) < MINIMUM_ATTENDANCE_RATE
}
