import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StudentReport } from '@/courses/report.api'
import { api } from '@/lib/api'
import { StudentReportPage } from './StudentReportPage'

function studentReport(overrides: Partial<StudentReport> = {}): StudentReport {
  return {
    student: { id: 'a1', ra: '180385', name: 'Ana Souza', photoUrl: null },
    data: [
      {
        sessionId: 's1',
        startsAt: '2026-11-20T13:00:00.000Z',
        status: 'PRESENT',
        confirmed: true,
        method: 'QR',
        recordedAt: '2026-11-20T13:04:00.000Z',
      },
      {
        sessionId: 's2',
        startsAt: '2026-11-13T13:00:00.000Z',
        status: 'ABSENT',
        confirmed: false,
        method: null,
        recordedAt: null,
      },
    ],
    pagination: { page: 1, itemsPerPage: 20, totalItems: 2, totalPages: 1 },
    summary: {
      confirmedSessions: 4,
      pendingSessions: 1,
      attendedSessions: 3,
      attendanceRate: 0.75,
    },
    ...overrides,
  }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [{ path: '/turmas/:courseId/relatorio/:studentId', element: <StudentReportPage /> }],
    { initialEntries: ['/turmas/c1/relatorio/a1'] },
  )

  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StudentReportPage', () => {
  it('mostra presença e falta dia a dia', async () => {
    vi.spyOn(api, 'request').mockResolvedValue(studentReport())

    renderPage()

    expect(await screen.findByText('Presente')).toBeInTheDocument()
    expect(screen.getByText('Falta')).toBeInTheDocument()
  })

  it('marca a chamada que ainda não foi confirmada', async () => {
    vi.spyOn(api, 'request').mockResolvedValue(studentReport())

    renderPage()

    expect(await screen.findByText('Sem confirmar')).toBeInTheDocument()
  })

  it('liga cada dia à chamada daquele dia', async () => {
    vi.spyOn(api, 'request').mockResolvedValue(studentReport())

    renderPage()

    const links = await screen.findAllByRole('link', { name: 'Ver chamada' })
    expect(links[0]).toHaveAttribute('href', '/turmas/c1/chamadas/s1')
    expect(links[1]).toHaveAttribute('href', '/turmas/c1/chamadas/s2')
  })

  it('conta as faltas sobre as aulas confirmadas', async () => {
    vi.spyOn(api, 'request').mockResolvedValue(studentReport())

    renderPage()

    expect(await screen.findByText('75%')).toBeInTheDocument()
    expect(screen.getByText('Mínimo de 75%')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('sem aula confirmada mostra travessão, nunca 0%', async () => {
    vi.spyOn(api, 'request').mockResolvedValue(
      studentReport({
        data: [],
        pagination: { page: 1, itemsPerPage: 20, totalItems: 0, totalPages: 0 },
        summary: {
          confirmedSessions: 0,
          pendingSessions: 0,
          attendedSessions: 0,
          attendanceRate: null,
        },
      }),
    )

    renderPage()

    expect(await screen.findByText('Nenhuma chamada encerrada')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })
})
