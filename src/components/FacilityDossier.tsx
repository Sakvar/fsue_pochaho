import type { DossierViewModel } from '@/game/dossierCopy'

type Props = {
  open: boolean
  model: DossierViewModel
  onToggle: () => void
}

export function FacilityDossier({ open, model, onToggle }: Props) {
  return (
    <>
      <button type="button" className="dossier-toggle" onClick={onToggle} aria-expanded={open}>
        {open ? 'Закрыть досье' : 'Досье объекта'}
      </button>
      <aside className={`dossier ${open ? 'dossier--open' : ''}`} aria-hidden={!open}>
        <div className="dossier__inner">
          <h2 className="dossier__title">Досье учреждения</h2>
          <dl className="dossier__facts">
            <div>
              <dt>Год</dt>
              <dd>{model.year}</dd>
            </div>
            <div>
              <dt>Решений принято</dt>
              <dd>{model.turn}</dd>
            </div>
          </dl>
          <section className="dossier__section">
            <h3>Слухи</h3>
            {model.rumors.length === 0 ? (
              <p className="dossier__muted">Пока тихо. Слишком тихо.</p>
            ) : (
              <ul>
                {model.rumors.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </section>
          <section className="dossier__section">
            <h3>Кризисные контуры</h3>
            {model.crises.length === 0 ? (
              <p className="dossier__muted">Активных кризисных меток нет.</p>
            ) : (
              <ul>
                {model.crises.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </section>
          <section className="dossier__section">
            <h3>Репутация</h3>
            <p>{model.reputation}</p>
          </section>
        </div>
      </aside>
    </>
  )
}
