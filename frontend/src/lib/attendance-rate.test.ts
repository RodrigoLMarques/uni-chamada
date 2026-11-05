import { describe, expect, it } from 'vitest'
import { isBelowMinimum, MINIMUM_ATTENDANCE_RATE, ratePercent } from './attendance-rate'

describe('ratePercent', () => {
  it('converte a fração da API em porcentagem inteira', () => {
    expect(ratePercent(1)).toBe(100)
    expect(ratePercent(0.85)).toBe(85)
    expect(ratePercent(0.5)).toBe(50)
    expect(ratePercent(0)).toBe(0)
  })

  it('não confunde presença total com um por cento', () => {
    expect(ratePercent(1)).not.toBe(1)
  })

  it('arredonda para inteiro', () => {
    expect(ratePercent(0.846)).toBe(85)
    expect(ratePercent(0.694)).toBe(69)
  })
})

describe('isBelowMinimum', () => {
  it('compara contra o mínimo em porcentagem', () => {
    expect(isBelowMinimum(1)).toBe(false)
    expect(isBelowMinimum(0.77)).toBe(false)
    expect(isBelowMinimum(0.69)).toBe(true)
  })

  it('o mínimo é exatamente a fronteira', () => {
    expect(isBelowMinimum(MINIMUM_ATTENDANCE_RATE / 100)).toBe(false)
    expect(isBelowMinimum((MINIMUM_ATTENDANCE_RATE - 1) / 100)).toBe(true)
  })
})
