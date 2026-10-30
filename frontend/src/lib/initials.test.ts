import { describe, expect, it } from 'vitest'
import { initialsFrom } from './initials'

describe('initialsFrom', () => {
  it('usa primeiro e último nome', () => {
    expect(initialsFrom('Marina Delfino')).toBe('MD')
    expect(initialsFrom('Ana Beatriz Correia')).toBe('AC')
  })

  it('ignora as partículas', () => {
    expect(initialsFrom('João Pedro da Valença')).toBe('JV')
    expect(initialsFrom('Carla Mendes do Amaral')).toBe('CA')
    expect(initialsFrom('Maria das Dores')).toBe('MD')
  })

  it('devolve uma letra para nome único', () => {
    expect(initialsFrom('Marina')).toBe('M')
  })

  it('tolera espaços extras e string vazia', () => {
    expect(initialsFrom('  Bruno   Tavares  ')).toBe('BT')
    expect(initialsFrom('   ')).toBe('')
  })
})
