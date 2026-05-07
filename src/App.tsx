import { DecisionCard } from '@/components/DecisionCard'
import { EndingScreen } from '@/components/EndingScreen'
import { FacilityDossier } from '@/components/FacilityDossier'
import { StampFeedback } from '@/components/StampFeedback'
import { StatusBars } from '@/components/StatusBars'
import { buildDossierView } from '@/game/dossierCopy'
import { selectCurrentCard, selectMeters } from '@/game/selectors'
import { useGameStore } from '@/game/store'
import { useCallback, useMemo } from 'react'
import '@/styles/app.css'

export default function App() {
  const resources = useGameStore((s) => s.resources)
  const flags = useGameStore((s) => s.flags)
  const meta = useGameStore((s) => s.meta)
  const currentCardId = useGameStore((s) => s.currentCardId)
  const phase = useGameStore((s) => s.phase)
  const endingId = useGameStore((s) => s.endingId)
  const dossierOpen = useGameStore((s) => s.dossierOpen)
  const stampMessage = useGameStore((s) => s.stampMessage)
  const choose = useGameStore((s) => s.choose)
  const newGame = useGameStore((s) => s.newGame)
  const toggleDossier = useGameStore((s) => s.toggleDossier)
  const clearStamp = useGameStore((s) => s.clearStamp)

  const meters = useMemo(() => selectMeters(resources), [resources])
  const card = useMemo(() => selectCurrentCard(currentCardId), [currentCardId])
  const dossierModel = useMemo(() => buildDossierView({ resources, flags, meta }), [resources, flags, meta])

  const handleClearStamp = useCallback(() => clearStamp(), [clearStamp])

  const left = card?.left
  const right = card?.right

  return (
    <div className="app-shell">
      <h1 className="app-title">ФГУП «ПОЧАХО» — закрытое направление</h1>
      <StatusBars meters={meters} />
      <main className="app-shell__main">
        <div className="app-shell__center">
          <DecisionCard card={card} />
        </div>
        <div className="app-shell__side">
          <FacilityDossier open={dossierOpen} model={dossierModel} onToggle={toggleDossier} />
        </div>
      </main>

      <div className="decisions" role="group" aria-label="Решение">
        <button
          type="button"
          className="decision-btn"
          onClick={() => choose('left')}
          disabled={phase !== 'playing' || !left}
        >
          <span className="decision-btn__label">{left?.label ?? '—'}</span>
          <span className="decision-btn__hint">{left?.previewHint ?? 'Нет данных'}</span>
        </button>
        <button
          type="button"
          className="decision-btn"
          onClick={() => choose('right')}
          disabled={phase !== 'playing' || !right}
        >
          <span className="decision-btn__label">{right?.label ?? '—'}</span>
          <span className="decision-btn__hint">{right?.previewHint ?? 'Нет данных'}</span>
        </button>
      </div>

      <StampFeedback message={stampMessage} onDone={handleClearStamp} />

      {phase === 'ended' && endingId ? <EndingScreen endingId={endingId} onRestart={newGame} /> : null}
    </div>
  )
}
