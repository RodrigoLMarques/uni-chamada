import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CourseDays } from './CourseDays'
import * as lookup from './lookup.api'
import type { StudentCourseSummary, StudentSessions } from './lookup.api'

const summary: StudentCourseSummary = {
  course: { id: 'c1', code: 'MAT-202', name: 'Cálculo II', term: '2026.2', period: 'EVENING' },
  confirmedSessions: 3,
  attendedSessions: 2,
  pendingSessions: 0,
  attendanceRate: 0.67,
}

function sessions(data: StudentSessions['data']): StudentSessions {
  return { data, pagination: { page: 1, itemsPerPage: 100, totalItems: data.length, totalPages: 1 } }
}

function renderDays() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <CourseDays ra="180385" summary={summary} onBack={() => {}} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CourseDays', () => {
  it('mostra cada dia com presença ou falta', async () => {
    vi.spyOn(lookup, 'getStudentCourseSessions').mockResolvedValue(
      sessions([
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
          confirmed: true,
          method: null,
          recordedAt: null,
        },
      ]),
    )

    renderDays()

    expect(await screen.findByText('Presente')).toBeInTheDocument()
    expect(screen.getByText('Falta')).toBeInTheDocument()
  })

  it('sem aula confirmada explica que o professor ainda não confirmou', async () => {
    vi.spyOn(lookup, 'getStudentCourseSessions').mockResolvedValue(sessions([]))

    renderDays()

    expect(await screen.findByText(/Nenhuma aula confirmada ainda/)).toBeInTheDocument()
  })

  it('pede o RA e a turma à API', async () => {
    const get = vi.spyOn(lookup, 'getStudentCourseSessions').mockResolvedValue(sessions([]))

    renderDays()
    await screen.findByText(/Nenhuma aula confirmada ainda/)

    expect(get).toHaveBeenCalledWith('180385', 'c1', 1, expect.anything())
  })
})
