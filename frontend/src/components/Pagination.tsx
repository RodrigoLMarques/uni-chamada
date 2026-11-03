import type { PaginationMeta } from '@/lib/pagination'
import { pagesToShow } from './pages-to-show'

export function Pagination({
  pagination,
  onChange,
}: {
  pagination: PaginationMeta
  onChange: (page: number) => void
}) {
  const { page, itemsPerPage, totalItems, totalPages } = pagination
  if (totalPages <= 1) return null

  const first = (page - 1) * itemsPerPage + 1
  const last = Math.min(page * itemsPerPage, totalItems)

  return (
    <nav className="uc-pagination" aria-label="Paginação">
      <span>
        Mostrando{' '}
        <strong style={{ color: 'var(--text)' }}>
          {first}–{last}
        </strong>{' '}
        de {totalItems}
      </span>
      <ul className="uc-pages">
        <li>
          <button
            className="uc-page"
            type="button"
            disabled={page === 1}
            onClick={() => onChange(page - 1)}
            aria-label="Página anterior"
          >
            <span className="uc-icon uc-i-chevron-left" aria-hidden="true" />
          </button>
        </li>
        {pagesToShow(page, totalPages).map((entry, index) =>
          entry === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true">
              <span className="uc-page-gap">…</span>
            </li>
          ) : (
            <li key={entry}>
              <button
                className="uc-page"
                type="button"
                aria-current={entry === page ? 'page' : undefined}
                onClick={() => onChange(entry)}
              >
                {entry}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            className="uc-page"
            type="button"
            disabled={page === totalPages}
            onClick={() => onChange(page + 1)}
            aria-label="Próxima página"
          >
            <span className="uc-icon uc-i-chevron-right" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
