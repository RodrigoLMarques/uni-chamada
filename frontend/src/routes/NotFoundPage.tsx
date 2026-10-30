import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="uc-centered">
      <div className="uc-empty uc-centered-panel">
        <span className="uc-empty-icon">
          <span className="uc-icon uc-icon-lg uc-i-search-x" aria-hidden="true" />
        </span>
        <h1 className="uc-empty-title">Página não encontrada</h1>
        <p className="uc-empty-body">O endereço não existe ou foi movido.</p>
        <div className="uc-empty-actions">
          <Link className="uc-btn uc-btn-secondary" to="/turmas">
            Ir para as turmas
          </Link>
        </div>
      </div>
    </div>
  )
}
