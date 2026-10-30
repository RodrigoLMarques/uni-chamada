/** Marca uma rota que o esqueleto já reserva mas que ainda não tem tela.
 *  Some conforme as tasks 11 a 14 entram. */
export function PlaceholderPage({ title, task }: { title: string; task: string }) {
  return (
    <>
      <h1 className="uc-page-title">{title}</h1>
      <div className="uc-empty">
        <span className="uc-empty-icon">
          <span className="uc-icon uc-icon-lg uc-i-hourglass" aria-hidden="true" />
        </span>
        <h2 className="uc-empty-title">Tela ainda não construída</h2>
        <p className="uc-empty-body">Esta rota entra na {task}.</p>
      </div>
    </>
  )
}
