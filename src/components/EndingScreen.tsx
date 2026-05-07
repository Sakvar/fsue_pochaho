import { getEndingCopy } from '@/game/endings'

type Props = {
  endingId: string
  onRestart: () => void
}

export function EndingScreen({ endingId, onRestart }: Props) {
  const ending = getEndingCopy(endingId)
  const title = ending?.title ?? 'Исход'
  const body = ending?.body ?? 'Состояние не классифицировано.'
  const kind = ending?.kind ?? 'failure'

  return (
    <div className="ending-screen" role="dialog" aria-modal="true" aria-labelledby="ending-title">
      <div className="ending-screen__panel">
        <p className={`ending-screen__badge ending-screen__badge--${kind}`}>
          {kind === 'failure' ? 'ПРЕКРАЩЕНИЕ ПОЛНОМОЧИЙ' : 'ИТОГ ЗАФИКСИРОВАН'}
        </p>
        <h1 id="ending-title" className="ending-screen__title">
          {title}
        </h1>
        <p className="ending-screen__body">{body}</p>
        <button type="button" className="ending-screen__restart" onClick={onRestart}>
          Новое назначение
        </button>
      </div>
    </div>
  )
}
