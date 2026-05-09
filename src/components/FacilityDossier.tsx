import { useCallback, useState, type ReactNode } from 'react'
import type { DossierViewModel } from '@/game/dossierCopy'

type Props = {
  open: boolean
  model: DossierViewModel
  onToggle: () => void
}

type DossierAccordionId =
  | 'departments'
  | 'projects'
  | 'archive'
  | 'rumors'
  | 'crises'
  | 'reputation'

type PanelProps = {
  id: DossierAccordionId
  title: string
  expandedId: DossierAccordionId | null
  onSelect: (id: DossierAccordionId) => void
  children: ReactNode
}

function DossierAccordionPanel({ id, title, expandedId, onSelect, children }: PanelProps) {
  const open = expandedId === id
  return (
    <div className="dossier-acc">
      <button
        type="button"
        className="dossier-acc__trigger"
        aria-expanded={open}
        onClick={() => onSelect(id)}
      >
        <span className="dossier-acc__title">{title}</span>
        <span className="dossier-acc__chevron" aria-hidden>
          {open ? '▼' : '▶'}
        </span>
      </button>
      {open ? <div className="dossier-acc__body">{children}</div> : null}
    </div>
  )
}

export function FacilityDossier({ open, model, onToggle }: Props) {
  const [expandedId, setExpandedId] = useState<DossierAccordionId | null>(null)

  const onSelect = useCallback((id: DossierAccordionId) => {
    setExpandedId((cur) => (cur === id ? null : id))
  }, [])

  const projectsEmpty =
    model.availableProjects.length === 0 &&
    model.activeProjects.length === 0 &&
    model.completedProjects.length === 0 &&
    model.failedProjects.length === 0

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

          <DossierAccordionPanel
            id="departments"
            title="Открытые отделы"
            expandedId={expandedId}
            onSelect={onSelect}
          >
            {model.unlockedDepartments.length === 0 ? (
              <p className="dossier__muted">Отделы ещё не расширены.</p>
            ) : (
              <ul>
                {model.unlockedDepartments.map((department) => (
                  <li key={department}>{department}</li>
                ))}
              </ul>
            )}
          </DossierAccordionPanel>

          <DossierAccordionPanel
            id="projects"
            title="Проекты"
            expandedId={expandedId}
            onSelect={onSelect}
          >
            {projectsEmpty ? (
              <p className="dossier__muted">По проектам записей нет.</p>
            ) : (
              <>
                {model.availableProjects.length > 0 ? (
                  <>
                    <h4 className="dossier-acc__subhead">Доступные</h4>
                    <ul>
                      {model.availableProjects.map((project) => (
                        <li key={project.id}>
                          {project.label} — {project.statusLabel} ({project.progress}% / риск{' '}
                          {project.risk}%)
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {model.activeProjects.length > 0 ? (
                  <>
                    <h4 className="dossier-acc__subhead">Активные</h4>
                    <ul>
                      {model.activeProjects.map((project) => (
                        <li key={project.id}>
                          {project.label} — {project.statusLabel} ({project.progress}% / риск{' '}
                          {project.risk}%)
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {model.completedProjects.length > 0 ? (
                  <>
                    <h4 className="dossier-acc__subhead">Завершённые</h4>
                    <ul>
                      {model.completedProjects.map((project) => (
                        <li key={project.id}>
                          {project.label} — {project.statusLabel}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {model.failedProjects.length > 0 ? (
                  <>
                    <h4 className="dossier-acc__subhead">Проваленные</h4>
                    <ul>
                      {model.failedProjects.map((project) => (
                        <li key={project.id}>
                          {project.label} — {project.statusLabel}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            )}
          </DossierAccordionPanel>

          <DossierAccordionPanel
            id="archive"
            title="Архив записей"
            expandedId={expandedId}
            onSelect={onSelect}
          >
            {model.archiveEntries.length === 0 ? (
              <p className="dossier__muted">Архив пуст.</p>
            ) : (
              <ul>
                {model.archiveEntries.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            )}
          </DossierAccordionPanel>

          <DossierAccordionPanel id="rumors" title="Слухи" expandedId={expandedId} onSelect={onSelect}>
            {model.rumors.length === 0 ? (
              <p className="dossier__muted">Пока тихо. Слишком тихо.</p>
            ) : (
              <ul>
                {model.rumors.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </DossierAccordionPanel>

          <DossierAccordionPanel
            id="crises"
            title="Кризисные контуры"
            expandedId={expandedId}
            onSelect={onSelect}
          >
            {model.crises.length === 0 ? (
              <p className="dossier__muted">Активных кризисных меток нет.</p>
            ) : (
              <ul>
                {model.crises.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </DossierAccordionPanel>

          <DossierAccordionPanel
            id="reputation"
            title="Репутация текущего назначения"
            expandedId={expandedId}
            onSelect={onSelect}
          >
            <p className="dossier-acc__text">{model.runReputation}</p>
          </DossierAccordionPanel>
        </div>
      </aside>
    </>
  )
}
