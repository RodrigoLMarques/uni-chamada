import { describe, expect, it } from 'vitest'
import { initialsFrom } from './initials'

describe('initialsFrom', () => {
  it('usa primeiro e último nome', () => {
    expect(initialsFrom('Test Student')).toBe('TS')
  })

  it('ignora o nome do meio', () => {
    expect(initialsFrom('Test Middle Student')).toBe('TS')
  })

  it('ignora as partículas', () => {
    expect(initialsFrom('Test da Student')).toBe('TS')
    expect(initialsFrom('Test dos Student')).toBe('TS')
    expect(initialsFrom('Test e Student')).toBe('TS')
  })

  it('devolve uma letra para nome único', () => {
    expect(initialsFrom('Student')).toBe('S')
  })

  it('tolera espaços extras e string vazia', () => {
    expect(initialsFrom('  Test   Student  ')).toBe('TS')
    expect(initialsFrom('   ')).toBe('')
  })
})
