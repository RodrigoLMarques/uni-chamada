import { describe, expect, it } from 'vitest'
import { parseRaList } from './manual.api'

describe('parseRaList', () => {
  it('aceita um RA por linha', () => {
    expect(parseRaList('158790\n160884\n161476')).toEqual(['158790', '160884', '161476'])
  })

  it('aceita vírgula, ponto e vírgula e espaço como separadores', () => {
    expect(parseRaList('158790, 160884; 161476 162455')).toEqual([
      '158790',
      '160884',
      '161476',
      '162455',
    ])
  })

  it('descarta o que não for dígito, para colar de planilha funcionar', () => {
    expect(parseRaList('RA 158790\n#160884')).toEqual(['158790', '160884'])
  })

  it('preserva zeros à esquerda', () => {
    expect(parseRaList('000014')).toEqual(['000014'])
  })

  it('não repete o mesmo RA', () => {
    expect(parseRaList('158790\n158790\n160884')).toEqual(['158790', '160884'])
  })

  it('devolve lista vazia quando não há dígito nenhum', () => {
    expect(parseRaList('   \n \n')).toEqual([])
    expect(parseRaList('abc')).toEqual([])
  })
})
