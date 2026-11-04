import { describe, expect, it } from 'vitest'
import { scanUrlFor } from './scan-url'

describe('scanUrlFor', () => {
  it('aponta para a tela pública do aluno, não para o token cru', () => {
    const url = scanUrlFor('abc.1a.sig')

    expect(url).toContain('/scan?t=')
    expect(new URL(url).searchParams.get('t')).toBe('abc.1a.sig')
  })

  it('escapa o token na query', () => {
    const url = scanUrlFor('t.abc.1a.sig+/=')

    expect(new URL(url).searchParams.get('t')).toBe('t.abc.1a.sig+/=')
  })
})
