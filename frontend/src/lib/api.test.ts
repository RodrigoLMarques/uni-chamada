import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, NetworkError, createApiClient } from './api'

function respondWith(body: unknown, init: ResponseInit = {}) {
  return vi.fn<typeof fetch>().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function clientWith(fetchMock: ReturnType<typeof respondWith>, overrides = {}) {
  vi.stubGlobal('fetch', fetchMock)
  return createApiClient({ baseUrl: 'https://api.test', ...overrides })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createApiClient', () => {
  it('manda o token quando existe', async () => {
    const fetchMock = respondWith({ ok: true })
    const api = clientWith(fetchMock, { getToken: () => 'abc123' })

    await api.request('/turmas')

    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer abc123')
  })

  it('não manda token em rota anônima', async () => {
    const fetchMock = respondWith({ ok: true })
    const api = clientWith(fetchMock, { getToken: () => 'abc123' })

    await api.request('/scan', { method: 'POST', body: {}, anonymous: true })

    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it('valida a resposta com o schema', async () => {
    const api = clientWith(respondWith({ id: 'c1', name: 'Cálculo II' }))

    const course = await api.request('/turmas/c1', {
      schema: z.object({ id: z.string(), name: z.string() }),
    })

    expect(course).toEqual({ id: 'c1', name: 'Cálculo II' })
  })

  it('lê a mensagem única do envelope do Nest', async () => {
    const api = clientWith(
      respondWith({ statusCode: 409, message: 'course already exists', error: 'Conflict' }, { status: 409 }),
    )

    await expect(api.request('/turmas')).rejects.toMatchObject({
      status: 409,
      message: 'course already exists',
    })
  })

  it('lê o array de mensagens do class-validator', async () => {
    const api = clientWith(
      respondWith(
        { statusCode: 400, message: ['ra is required', 'token is required'], error: 'Bad Request' },
        { status: 400 },
      ),
    )

    const error = await api.request('/scan').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).messages).toEqual(['ra is required', 'token is required'])
  })

  it('chama o handler de 401 e ainda assim rejeita', async () => {
    const onUnauthorized = vi.fn()
    const api = clientWith(respondWith({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }), {
      onUnauthorized,
    })

    await expect(api.request('/auth/me')).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('não chama o handler de 401 em outros erros', async () => {
    const onUnauthorized = vi.fn()
    const api = clientWith(respondWith({ statusCode: 403, message: 'Forbidden' }, { status: 403 }), {
      onUnauthorized,
    })

    await expect(api.request('/turmas')).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('trata 204 sem corpo', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }))
    const api = clientWith(fetchMock as ReturnType<typeof respondWith>)

    await expect(api.request('/turmas/c1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('transforma falha de rede em NetworkError', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    const api = clientWith(fetchMock as ReturnType<typeof respondWith>)

    await expect(api.request('/turmas')).rejects.toBeInstanceOf(NetworkError)
  })

  it('deixa o AbortError passar inteiro', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    const api = clientWith(fetchMock as ReturnType<typeof respondWith>)

    await expect(api.request('/turmas')).rejects.toBeInstanceOf(DOMException)
  })
})
