export type Position = { latitude: number; longitude: number; accuracyM?: number }

export type PositionResult =
  | { kind: 'granted'; position: Position }
  | { kind: 'denied' }
  | { kind: 'timeout' }
  | { kind: 'unavailable' }

const TIMEOUT_MS = 10_000

export const POSITION_MESSAGES: Record<Exclude<PositionResult['kind'], 'granted'>, string> = {
  denied: 'Você bloqueou a localização para este site.',
  timeout: 'O navegador demorou demais para achar a localização.',
  unavailable: 'Este navegador não conseguiu obter a localização.',
}

/** Nunca rejeita: recusar a localização não pode impedir a ação que depende dela.
 *  Quem chama decide o que fazer com cada desfecho.
 *
 *  Vale lembrar que isto exige contexto seguro: funciona em https e em
 *  localhost, e falha quando o site é aberto por IP na rede local. Firefox e
 *  derivados ainda dependem de um serviço de rede para resolver a posição, e
 *  quando ele está desligado o pedido estoura o prazo em vez de ser negado. */
export function requestPosition(timeoutMs = TIMEOUT_MS): Promise<PositionResult> {
  if (!('geolocation' in navigator) || !window.isSecureContext) {
    return Promise.resolve({ kind: 'unavailable' })
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (reading) =>
        resolve({
          kind: 'granted',
          position: {
            latitude: reading.coords.latitude,
            longitude: reading.coords.longitude,
            accuracyM: Number.isFinite(reading.coords.accuracy)
              ? reading.coords.accuracy
              : undefined,
          },
        }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) resolve({ kind: 'denied' })
        else if (error.code === error.TIMEOUT) resolve({ kind: 'timeout' })
        else resolve({ kind: 'unavailable' })
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    )
  })
}
