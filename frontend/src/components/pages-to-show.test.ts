import { describe, expect, it } from 'vitest'
import { pagesToShow } from './pages-to-show'

describe('pagesToShow', () => {
  it('lista tudo até 7 páginas', () => {
    expect(pagesToShow(1, 1)).toEqual([1])
    expect(pagesToShow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('abre reticências no fim quando a atual está no começo', () => {
    expect(pagesToShow(2, 20)).toEqual([1, 2, 3, 'gap', 20])
  })

  it('abre reticências dos dois lados no meio', () => {
    expect(pagesToShow(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20])
  })

  it('abre reticências no começo quando a atual está no fim', () => {
    expect(pagesToShow(20, 20)).toEqual([1, 'gap', 19, 20])
  })

  it('nunca produz página fora do intervalo', () => {
    for (const page of pagesToShow(1, 50)) {
      if (page !== 'gap') expect(page).toBeGreaterThanOrEqual(1)
    }
    for (const page of pagesToShow(50, 50)) {
      if (page !== 'gap') expect(page).toBeLessThanOrEqual(50)
    }
  })
})
