import { BrandMark } from '@/brand/BrandMark'

/** Mostrado enquanto o /auth/me confirma o token guardado. O shell já aparece
 *  com a forma final para a tela não saltar quando os dados chegarem. */
export function AppShellSkeleton() {
  return (
    <div className="uc-app" aria-busy="true">
      <nav className="uc-sidenav" aria-label="Principal">
        <span className="uc-sidenav-brand">
          <BrandMark size={28} />
          UniChamada
        </span>
        <ul className="uc-sidenav-list">
          {[0, 1, 2, 3].map((row) => (
            <li key={row} style={{ padding: 'var(--space-2) var(--space-3)' }}>
              <span className="uc-skeleton uc-skeleton-text" style={{ width: '70%' }} />
            </li>
          ))}
        </ul>
      </nav>
      <main className="uc-app-main">
        <span className="uc-skeleton uc-skeleton-text" style={{ width: '220px', height: '28px' }} />
        <span className="uc-visually-hidden">Carregando</span>
      </main>
    </div>
  )
}
