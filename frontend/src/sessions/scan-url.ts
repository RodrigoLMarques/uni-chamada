export function scanUrlFor(token: string): string {
  return `${window.location.origin}/scan?t=${encodeURIComponent(token)}`
}
