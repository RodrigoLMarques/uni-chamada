import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QrCode } from './QrCode'

function viewBoxOf(token: string): string {
  const { container } = render(<QrCode value={token} size={100} label="QR" />)
  return container.querySelector('svg')!.getAttribute('viewBox')!
}

describe('QrCode', () => {
  it('dimensiona o viewBox pelo código gerado, não por um número fixo', () => {
    const curto = viewBoxOf('abc')
    const real = viewBoxOf('zry1vszhgazbwtl7ab8djtfc.1a2b3c.9f8e7d6c5b4a3210')

    expect(curto).not.toBe(real)
    expect(real).toBe('-4 -4 41 41')
  })

  it('mantém a zona de silêncio de 4 módulos nos dois lados', () => {
    const [x, y, width, height] = viewBoxOf('zry1vszhgazbwtl7ab8djtfc.1a2b3c.9f8e7d6c5b4a3210')
      .split(' ')
      .map(Number)

    expect(x).toBe(-4)
    expect(y).toBe(-4)
    expect(width).toBe(33 + 8)
    expect(height).toBe(width)
  })

  it('desenha o código como um path só', () => {
    const { container } = render(<QrCode value="chamada" size={100} label="QR" />)
    const paths = container.querySelectorAll('path')

    expect(paths).toHaveLength(1)
    expect(paths[0]!.getAttribute('d')!.length).toBeGreaterThan(0)
  })
})
