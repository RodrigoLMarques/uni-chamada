import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDate, formatDistance, formatTime, formatTimeWithSeconds } from './format'

describe('formatDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-31T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('omite o ano quando é o atual', () => {
    expect(formatDate('2026-10-17T19:00:00')).toBe('17/10')
  })

  it('mostra o ano quando não é o atual', () => {
    expect(formatDate('2025-10-17T19:00:00')).toBe('17/10/2025')
  })
})

describe('formatTime', () => {
  it('usa 24h sem segundos para horário de aula', () => {
    expect(formatTime('2026-10-17T19:00:00')).toBe('19:00')
  })

  it('inclui segundos no horário de registro', () => {
    expect(formatTimeWithSeconds('2026-10-17T19:03:41')).toBe('19:03:41')
  })
})

describe('formatDistance', () => {
  it('usa metros até 999', () => {
    expect(formatDistance(0)).toBe('0 m')
    expect(formatDistance(420)).toBe('420 m')
    expect(formatDistance(999)).toBe('999 m')
  })

  it('arredonda metros para inteiro', () => {
    expect(formatDistance(420.6)).toBe('421 m')
  })

  it('passa para quilômetros com vírgula a partir de 1000', () => {
    expect(formatDistance(1000)).toBe('1,0 km')
    expect(formatDistance(1234)).toBe('1,2 km')
  })

  it('devolve null sem distância', () => {
    expect(formatDistance(null)).toBeNull()
  })
})
