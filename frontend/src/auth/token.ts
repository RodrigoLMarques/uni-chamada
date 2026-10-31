import { clearStored, readStored, writeStored } from '@/lib/storage'
import { AUTH_STORAGE_KEY } from './auth-context'

/** O token vive fora do React porque o cliente HTTP precisa dele de forma síncrona,
 *  antes de qualquer efeito rodar. Um filho pode disparar requisição no próprio
 *  efeito, que roda antes do efeito do provider. */
let token: string | null = readStored(AUTH_STORAGE_KEY)

export function getToken(): string | null {
  return token
}

export function storeToken(next: string): void {
  token = next
  writeStored(AUTH_STORAGE_KEY, next)
}

export function discardToken(): void {
  token = null
  clearStored(AUTH_STORAGE_KEY)
}
