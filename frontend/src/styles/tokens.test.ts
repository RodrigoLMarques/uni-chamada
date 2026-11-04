import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8')

describe('tokens.css gerado', () => {
  it('declara os temas em seletor de atributo, sem prender ao :root', () => {
    expect(css).toMatch(/^\[data-theme="dark"\] \{/m)
    expect(css).toMatch(/^\[data-theme="light"\] \{/m)
    expect(css).not.toMatch(/:root\[data-theme=/)
  })

  it('permite voltar ao claro dentro de uma raiz escura', () => {
    const lightBlock = css.slice(css.indexOf('[data-theme="light"] {'))
    expect(lightBlock).toContain('--text:')
    expect(lightBlock).toContain('--bg:')
  })

  it('segue o sistema quando não há escolha explícita', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark)')
    expect(css).toContain(':root:not([data-theme="light"])')
  })
})
