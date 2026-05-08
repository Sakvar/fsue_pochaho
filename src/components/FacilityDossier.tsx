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
              <dt>Ход</dt>
              <dd>{model.turn}</dd>
            </div>
            <div>
              <dt>Уровень института</dt>
              <dd>{model.instituteLevel}</dd>
            </div>
            <div>
              <dt>Репутация института</dt>
              <dd>{model.instituteReputation}</dd>
            </div>
            <div>
              <dt>Завершено назначений</dt>
              <dd>{model.completedRuns}</dd>
            </div>
          </dl>
          <section className="dossier__section">
            <h3>Сводка текущего назначения</h3>
            <ul>
              {model.resourcesSummary.map((resource) => (
                <li key={resource.key}>
                  {resource.label}: {resource.value}
                </li>
              ))}
            </ul>
          </section>
          <section className="dossier__section">
            <h3>Открытые отделы</h3>
            {model.unlockedDepartments.length === 0 ? (
              <p className="dossier__muted">Отделы ещё не расширены.</p>
            ) : (
              <ul>
                {model.unlockedDepartments.map((department) => (
                  <li key={department}>{department}</li>
                ))}
              </ul>
            )}
          </section>
          <section className="dossier__section">
            <h3>Проекты (доступные)</h3>
            {model.availableProjects.length === 0 ? (
              <p className="dossier__muted">Нет проектов в ожидании запуска.</p>
            ) : (
              <ul>
                {model.availableProjects.map((project) => (
                  <li key={project.id}>
                    {project.label} — {project.statusLabel} ({project.progress}% / риск {project.risk}%)
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="dossier__section">
            <h3>Проекты (активные)</h3>
            {model.activeProjects.length === 0 ? (
              <p className="dossier__muted">Активных проектов пока нет.</p>
            ) : (
              <ul>
                {model.activeProjects.map((project) => (
                  <li key={project.id}>
                    {project.label} — {project.statusLabel} ({project.progress}% / риск {project.risk}%)
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="dossier__section">
            <h3>Проекты (завершённые)</h3>
            {model.completedProjects.length === 0 ? (
              <p className="dossier__muted">Завершённых проектов нет.</p>
            ) : (
              <ul>
                {model.completedProjects.map((project) => (
                  <li key={project.id}>
                    {project.label} — {project.statusLabel}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="dossier__section">
            <h3>Проекты (проваленные)</h3>
            {model.failedProjects.length === 0 ? (
              <p className="dossier__muted">Провалов по проектам не зафиксировано.</p>
            ) : (
              <ul>
                {model.failedProjects.map((project) => (
                  <li key={project.id}>
                    {project.label} — {project.statusLabel}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="dossier__section">
            <h3>Архив записей</h3>
            {model.archiveEntries.length === 0 ? (
              <p className="dossier__muted">Архив пуст.</p>
            ) : (
              <ul>
                {model.archiveEntries.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            )}
          </section>
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
            <h3>Репутация текущего назначения</h3>
            <p>{model.runReputation}</p>
          </section>
        </div>
      </aside>
    </>
  )
}
