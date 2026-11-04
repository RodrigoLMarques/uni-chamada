import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AttendanceMeter } from './AttendanceMeter'
import type { StudentCourseSummary } from './lookup.api'

function summary(overrides: Partial<StudentCourseSummary> = {}): StudentCourseSummary {
  return {
    course: { id: 'c1', code: 'MAT-202', name: 'Cálculo II', term: '2026.2', period: 'EVENING' },
    confirmedSessions: 13,
    attendedSessions: 11,
    pendingSessions: 0,
    attendanceRate: 85,
    ...overrides,
  }
}

describe('AttendanceMeter', () => {
  it('mostra a porcentagem inteira e a contagem de aulas', () => {
    render(<AttendanceMeter summary={summary()} />)

    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('11 presenças em 13 aulas confirmadas')).toBeInTheDocument()
  })

  it('arredonda para inteiro, sem casa decimal', () => {
    render(<AttendanceMeter summary={summary({ attendanceRate: 84.6 })} />)

    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('sem aula confirmada mostra travessão, nunca 0%', () => {
    render(
      <AttendanceMeter
        summary={summary({ attendanceRate: null, confirmedSessions: 0, attendedSessions: 0 })}
      />,
    )

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
    expect(screen.getByText('Nenhuma aula confirmada ainda')).toBeInTheDocument()
  })

  it('zero por cento é resultado e continua aparecendo como 0%', () => {
    render(<AttendanceMeter summary={summary({ attendanceRate: 0, attendedSessions: 0 })} />)

    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.queryByText('Nenhuma aula confirmada ainda')).not.toBeInTheDocument()
  })

  it('avisa quando está abaixo do mínimo', () => {
    render(<AttendanceMeter summary={summary({ attendanceRate: 67 })} />)

    expect(screen.getByText('Abaixo do mínimo de 75%')).toBeInTheDocument()
  })

  it('conta as aulas pendentes, que ficam fora do denominador', () => {
    render(<AttendanceMeter summary={summary({ pendingSessions: 2 })} />)

    expect(screen.getByText('2 aulas aguardando confirmação')).toBeInTheDocument()
  })

  it('usa singular com uma aula pendente', () => {
    render(<AttendanceMeter summary={summary({ pendingSessions: 1 })} />)

    expect(screen.getByText('1 aula aguardando confirmação')).toBeInTheDocument()
  })
})
