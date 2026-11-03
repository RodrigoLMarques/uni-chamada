import { useId, useState } from 'react'
import { Link, NavLink, useParams } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { BrandMark } from '@/brand/BrandMark'
import { useCourses } from '@/courses/useCourses'
import { initialsFrom } from '@/lib/initials'
import { ProfileMenu } from './ProfileMenu'

const COURSE_SECTIONS = [
  { to: '', label: 'Chamadas', end: true },
  { to: '/relatorio', label: 'Relatório', end: false },
  { to: '/alunos', label: 'Alunos', end: false },
]

export function SideNav() {
  const { teacher, signOut } = useAuth()
  const { courseId } = useParams()
  const { data: courses, isPending } = useCourses()
  const [menuOpen, setMenuOpen] = useState(false)
  const sectionLabelId = useId()

  return (
    <nav className="uc-sidenav" aria-label="Principal">
      <Link className="uc-sidenav-brand" to="/turmas">
        <BrandMark size={28} />
        UniChamada
      </Link>

      <ul className="uc-sidenav-list">
        <li>
          <NavLink className="uc-sidenav-item" to="/turmas" end>
            <span className="uc-icon uc-i-book-open" aria-hidden="true" />
            Turmas
          </NavLink>
        </li>
      </ul>

      <p className="uc-sidenav-section-label" id={sectionLabelId}>
        Ativas
      </p>

      {isPending ? (
        <ul className="uc-sidenav-list" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <li key={row} className="uc-sidenav-skeleton-row">
              <span className="uc-skeleton uc-skeleton-text" style={{ width: '70%' }} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="uc-sidenav-list" aria-labelledby={sectionLabelId}>
          {courses?.map((course) => {
            const active = course.id === courseId
            return (
              <li key={course.id}>
                <NavLink
                  className="uc-sidenav-item"
                  to={`/turmas/${course.id}`}
                  style={active ? { color: 'var(--text)', fontWeight: 600 } : undefined}
                >
                  <span
                    className={`uc-icon ${active ? 'uc-i-chevron-down' : 'uc-i-chevron-right'}`}
                    aria-hidden="true"
                  />
                  <span className="uc-sidenav-course-name">{course.name}</span>
                  {course.openSessionId ? (
                    <>
                      <span className="uc-stat-dot uc-stat-dot-success" aria-hidden="true" />
                      <span className="uc-visually-hidden">Chamada aberta</span>
                    </>
                  ) : null}
                </NavLink>

                {active ? (
                  <ul className="uc-sidenav-list uc-sidenav-sections" aria-label={`Seções de ${course.name}`}>
                    {COURSE_SECTIONS.map((section) => (
                      <li key={section.label}>
                        <NavLink
                          className="uc-sidenav-item"
                          to={`/turmas/${course.id}${section.to}`}
                          end={section.end}
                        >
                          {section.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      <div className="uc-sidenav-foot">
        {teacher ? (
          <button
            className="uc-sidenav-profile"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="uc-avatar uc-avatar-sm" aria-hidden="true">
              {initialsFrom(teacher.name)}
            </span>
            <span className="uc-sidenav-profile-name">{teacher.name}</span>
            <span className="uc-icon uc-i-chevrons-up-down" aria-hidden="true" />
          </button>
        ) : null}

        {menuOpen && teacher ? (
          <ProfileMenu teacher={teacher} onClose={() => setMenuOpen(false)} onSignOut={signOut} />
        ) : null}
      </div>
    </nav>
  )
}
