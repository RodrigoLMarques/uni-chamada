import { useId, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { BrandMark } from '@/brand/BrandMark'
import { initialsFrom } from '@/lib/initials'
import { PLACEHOLDER_COURSES } from './placeholder-courses'
import { ProfileMenu } from './ProfileMenu'

export function SideNav() {
  const { teacher, signOut } = useAuth()
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
      <ul className="uc-sidenav-list" aria-labelledby={sectionLabelId}>
        {PLACEHOLDER_COURSES.map((course) => (
          <li key={course.slug}>
            <NavLink className="uc-sidenav-item" to={`/turmas/${course.slug}`}>
              <span className="uc-icon uc-i-chevron-right" aria-hidden="true" />
              <span className="uc-sidenav-course-name">{course.name}</span>
              {course.hasOpenSession ? (
                <>
                  <span className="uc-stat-dot uc-stat-dot-success" aria-hidden="true" />
                  <span className="uc-visually-hidden">Chamada aberta</span>
                </>
              ) : null}
            </NavLink>
          </li>
        ))}
      </ul>

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
          <ProfileMenu
            teacher={teacher}
            onClose={() => setMenuOpen(false)}
            onSignOut={signOut}
          />
        ) : null}
      </div>
    </nav>
  )
}
