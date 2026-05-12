import { ENDING_DEFINITIONS } from '@/data/endings'
import { hasEndingInArchive } from '@/game/endingDiscovery'

type Props = {
  archive: string[]
}

export function EndingsArchiveSection({ archive }: Props) {
  const discoveredCount = ENDING_DEFINITIONS.filter((e) => hasEndingInArchive(archive, e.id)).length

  return (
    <section className="endings-archive" aria-label="Архив исходов">
      <p className="endings-archive__intro">
        Открыто исходов: {discoveredCount} / {ENDING_DEFINITIONS.length}. Записи появляются после завершения
        назначения.
      </p>
      <ul className="endings-archive__list">
        {ENDING_DEFINITIONS.map((ending) => {
          const open = hasEndingInArchive(archive, ending.id)
          return (
            <li key={ending.id} className={`endings-archive__item ${open ? '' : 'endings-archive__item--locked'}`}>
              <div className="endings-archive__stamp" aria-hidden>
                {open ? '✓' : '▒'}
              </div>
              <div className="endings-archive__text">
                <p className="endings-archive__title">{open ? ending.title : 'Засекречено'}</p>
                {open ? (
                  <p className="endings-archive__meta">{ending.kind === 'victory' ? 'Итог' : 'Прекращение'}</p>
                ) : (
                  <p className="endings-archive__meta">Силуэт исхода в архиве</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="endings-archive__stamps" aria-label="Штампы архива">
        <p className="endings-archive__stamps-label">Штампы архива</p>
        <div className="endings-archive__stamps-row">
          {ENDING_DEFINITIONS.map((ending) => {
            const open = hasEndingInArchive(archive, ending.id)
            return (
              <span
                key={ending.id}
                className={`endings-archive__chip ${open ? 'endings-archive__chip--open' : 'endings-archive__chip--locked'}`}
                title={open ? ending.title : 'Не открыт'}
              >
                {open ? ending.id.replace(/_/g, ' ') : '██'}
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}
