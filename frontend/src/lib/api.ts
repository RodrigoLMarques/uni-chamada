import type { ZodType } from 'zod'

/** Envelope de erro do NestJS. `message` vem string em erro único e array quando
 *  o class-validator reprova vários campos de uma vez. */
type ErrorBody = {
  statusCode?: number
  message?: string | string[]
  error?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly messages: string[]

  constructor(status: number, messages: string[]) {
    super(messages[0] ?? 'Não foi possível completar a ação.')
    this.name = 'ApiError'
    this.status = status
    this.messages = messages
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isRateLimited() {
    return this.status === 429
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Não foi possível falar com o servidor. Verifique sua conexão.')
    this.name = 'NetworkError'
    this.cause = cause
  }
}

export type RequestConfig<T> = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Valida a resposta. Sem schema, o corpo é descartado e a função devolve `undefined`. */
  schema?: ZodType<T>
  signal?: AbortSignal
  /** Rotas públicas (/scan, /consulta) não mandam Authorization. */
  anonymous?: boolean
}

export type ApiClientOptions = {
  baseUrl: string
  getToken?: () => string | null
  onUnauthorized?: () => void
}

function messagesFrom(body: unknown, status: number): string[] {
  if (typeof body === 'object' && body !== null) {
    const { message } = body as ErrorBody
    if (Array.isArray(message) && message.length > 0) return message
    if (typeof message === 'string' && message.length > 0) return [message]
  }
  if (status >= 500) return ['O servidor falhou ao responder. Tente de novo em instantes.']
  return ['Não foi possível completar a ação.']
}

export function createApiClient(options: ApiClientOptions) {
  const base = options.baseUrl.replace(/\/+$/, '')
  let getToken = options.getToken ?? (() => null)
  let onUnauthorized = options.onUnauthorized ?? (() => {})

  async function request<T = undefined>(path: string, config: RequestConfig<T> = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' }

    if (!config.anonymous) {
      const token = getToken()
      if (token) headers.Authorization = `Bearer ${token}`
    }
    if (config.body !== undefined) headers['Content-Type'] = 'application/json'

    let response: Response
    try {
      response = await fetch(`${base}${path}`, {
        method: config.method ?? 'GET',
        headers,
        body: config.body === undefined ? undefined : JSON.stringify(config.body),
        signal: config.signal,
      })
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
      throw new NetworkError(cause)
    }

    const payload = response.status === 204 ? undefined : await response.json().catch(() => undefined)

    if (!response.ok) {
      // O 401 derruba a sessão inteira: não existe refresh token no backend.
      if (response.status === 401) onUnauthorized()
      throw new ApiError(response.status, messagesFrom(payload, response.status))
    }

    if (!config.schema) return undefined as T
    return config.schema.parse(payload)
  }

  return {
    request,
    setTokenSource(source: () => string | null) {
      getToken = source
    },
    setUnauthorizedHandler(handler: () => void) {
      onUnauthorized = handler
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api = createApiClient({ baseUrl })
