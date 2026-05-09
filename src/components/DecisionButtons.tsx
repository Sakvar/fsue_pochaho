import type { CardOption } from '@/data/types'
import type { GamePhase } from '@/game/types'

type Props = {
  phase: GamePhase
  left: CardOption | undefined
  right: CardOption | undefined
  onChooseLeft: () => void
  onChooseRight: () => void
  variant: 'fixed' | 'inline'
}

export function DecisionButtons({ phase, left, right, onChooseLeft, onChooseRight, variant }: Props) {
  const mod = variant === 'fixed' ? 'decisions decisions--fixed' : 'decisions decisions--inline'

  return (
    <div className={mod} role="group" aria-label="Решение">
      <button type="button" className="decision-btn" onClick={onChooseLeft} disabled={phase !== 'playing' || !left}>
        <span className="decision-btn__label">{left?.label ?? '—'}</span>
        <span className="decision-btn__hint">{left?.previewHint ?? 'Нет данных'}</span>
      </button>
      <button type="button" className="decision-btn" onClick={onChooseRight} disabled={phase !== 'playing' || !right}>
        <span className="decision-btn__label">{right?.label ?? '—'}</span>
        <span className="decision-btn__hint">{right?.previewHint ?? 'Нет данных'}</span>
      </button>
    </div>
  )
}
