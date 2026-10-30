/** localStorage falha em janela anônima, com dados do site bloqueados e em
 *  alguns navegadores embarcados. Nada aqui pode derrubar a tela. */

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Sem persistência o app segue funcionando; só não lembra entre sessões.
  }
}

export function clearStored(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // idem
  }
}
