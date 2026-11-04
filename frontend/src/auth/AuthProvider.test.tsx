import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_STORAGE_KEY } from './auth-context'

const TEACHER = { id: 'u1', name: 'Test Teacher', email: 'teacher@example.test' }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

/** token.ts lê o localStorage no carregamento do módulo, então cada cenário precisa
 *  de um módulo novo depois de semear o storage. */
async function renderWithToken(token: string | null) {
  if (token) window.localStorage.setItem(AUTH_STORAGE_KEY, token)
  vi.resetModules()

  const { AuthProvider } = await import('./AuthProvider')
  const { useAuth } = await import('./useAuth')

  function Probe() {
    const { status, teacher } = useAuth()
    return (
      <>
        <span data-testid="status">{status}</span>
        <span data-testid="teacher">{teacher?.name ?? '—'}</span>
      </>
    )
  }

  render(
    <Wrapper>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </Wrapper>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AuthProvider', () => {
  it('fica anônimo quando não há token guardado', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>())

    await renderWithToken(null)

    expect(await screen.findByTestId('status')).toHaveTextContent('anonymous')
  })

  it('confirma o token guardado com o /auth/me', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(TEACHER)))

    await renderWithToken('token-valido')

    expect(await screen.findByTestId('status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('teacher')).toHaveTextContent('Test Teacher')
  })

  it('encerra a sessão e descarta o token quando o /auth/me devolve 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401)),
    )

    await renderWithToken('token-expirado')

    expect(await screen.findByTestId('status')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('teacher')).toHaveTextContent('—')
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('também encerra a sessão quando o servidor está fora', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await renderWithToken('token-qualquer')

    expect(await screen.findByTestId('status')).toHaveTextContent('anonymous')
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })
})
