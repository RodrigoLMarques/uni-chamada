import { useId } from 'react'
import { EMPTY } from '@/lib/format'
import { isBelowMinimum, MINIMUM_ATTENDANCE_RATE, ratePercent } from '@/lib/attendance-rate'
import type { StudentCourseSummary } from './lookup.api'

export function AttendanceMeter({ summary }: { summary: StudentCourseSummary }) {
  const noteId = useId()
  const { attendanceRate, attendedSessions, confirmedSessions, pendingSessions, course } = summary

  if (attendanceRate === null) {
    return (
      <div
        className="uc-meter uc-meter-lg is-empty"
        role="img"
        aria-label={`Frequência em ${course.name} sem dado: nenhuma aula confirmada ainda`}
      >
        <div className="uc-meter-head">
          <span className="uc-meter-label">Frequência</span>
          <span className="uc-meter-value">{EMPTY}</span>
        </div>
        <div className="uc-meter-track" />
        <div className="uc-meter-foot">
          <span>Nenhuma aula confirmada ainda</span>
        </div>
      </div>
    )
  }

  const rate = ratePercent(attendanceRate)
  const below = isBelowMinimum(attendanceRate)

  return (
    <div
      className={below ? 'uc-meter uc-meter-lg is-below' : 'uc-meter uc-meter-lg'}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rate}
      aria-label={
        below
          ? `Frequência em ${course.name}: ${rate}%, abaixo do mínimo de ${MINIMUM_ATTENDANCE_RATE}%`
          : `Frequência em ${course.name}: ${rate}%`
      }
      aria-describedby={below || pendingSessions > 0 ? noteId : undefined}
    >
      <div className="uc-meter-head">
        <span className="uc-meter-label">Frequência</span>
        <span className="uc-meter-value">{rate}%</span>
      </div>
      <div className="uc-meter-track">
        <div className="uc-meter-fill" style={{ width: `${rate}%` }} />
        <span className="uc-meter-min" aria-hidden="true" />
      </div>
      <div className="uc-meter-foot">
        <span>
          {attendedSessions} {attendedSessions === 1 ? 'presença' : 'presenças'} em{' '}
          {confirmedSessions} {confirmedSessions === 1 ? 'aula confirmada' : 'aulas confirmadas'}
        </span>
        <span>mín. {MINIMUM_ATTENDANCE_RATE}%</span>
      </div>

      {below ? (
        <p className="uc-meter-below" id={noteId}>
          <span className="uc-icon uc-i-triangle-alert" aria-hidden="true" />
          Abaixo do mínimo de {MINIMUM_ATTENDANCE_RATE}%
        </p>
      ) : pendingSessions > 0 ? (
        <p className="uc-meter-pending" id={noteId}>
          <span className="uc-icon uc-i-hourglass" aria-hidden="true" />
          {pendingSessions}{' '}
          {pendingSessions === 1 ? 'aula aguardando confirmação' : 'aulas aguardando confirmação'}
        </p>
      ) : null}
    </div>
  )
}
