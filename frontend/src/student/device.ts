import { readStored, writeStored } from '@/lib/storage'

const DEVICE_STORAGE_KEY = 'unichamada.device'

export function storedDeviceToken(): string | undefined {
  return readStored(DEVICE_STORAGE_KEY) ?? undefined
}

export function rememberDeviceToken(token: string | undefined): void {
  if (token) writeStored(DEVICE_STORAGE_KEY, token)
}
