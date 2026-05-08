import { DecisionCard } from '@/components/DecisionCard'
import { EndingScreen } from '@/components/EndingScreen'
import { FacilityDossier } from '@/components/FacilityDossier'
import { StampFeedback } from '@/components/StampFeedback'
import { StatusBars } from '@/components/StatusBars'
import { buildDossierView } from '@/game/dossierCopy'
import { canSelectScenario, getScenario, isScenarioUnlocked, scenarioLockHint, SCENARIOS } from '@/game/scenarios'
import { selectCurrentCard, selectMeters } from '@/game/selectors'
import { useGameStore } from '@/game/store'
import { initTelegramMiniApp, telegramImpact } from '@/integrations/telegram'
import { useCallback, useEffect, useMemo, useState } from 'react'
import '@/styles/app.css'

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)

    onChange()

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }

    // Legacy Safari fallback
    const legacy = mql as unknown as {
      addListener?: (listener: () => void) => void
      removeListener?: (listener: () => void) => void
    }
    legacy.addListener?.(onChange)
    return () => legacy.removeListener?.(onChange)
  }, [query])

  return matches
}

export default function App() {
  const resources = useGameStore((s) => s.resources)
  const flags = useGameStore((s) => s.flags)
  const institute = useGameStore((s) => s.institute)
  const meta = useGameStore((s) => s.meta)
  const currentCardId = useGameStore((s) => s.currentCardId)
  const cardsById = useGameStore((s) => s.cardsById)
  const phase = useGameStore((s) => s.phase)
  const endingId = useGameStore((s) => s.endingId)
  const endingRewards = useGameStore((s) => s.endingRewards)
  const dossierOpen = useGameStore((s) => s.dossierOpen)
  const mobileTab = useGameStore((s) => s.mobileTab)
  const stampMessage = useGameStore((s) => s.stampMessage)
  const choose = useGameStore((s) => s.choose)
  const newGame = useGameStore((s) => s.newGame)
  const setScenario = useGameStore((s) => s.setScenario)
  const toggleDossier = useGameStore((s) => s.toggleDossier)
  const setMobileTab = useGameStore((s) => s.setMobileTab)
  const clearStamp = useGameStore((s) => s.clearStamp)

  const scenario = useMemo(() => getScenario(meta.scenarioId), [meta.scenarioId])
  const meters = useMemo(() => selectMeters(resources), [resources])
  const card = useMemo(() => selectCurrentCard(currentCardId, cardsById), [currentCardId, cardsById])
  const dossierModel = useMemo(
    () => buildDossierView({ resources, flags, meta, institute }, scenario.dossierCopy),
    [resources, flags, meta, institute, scenario.dossierCopy],
  )
  const scenarioOptions = useMemo(
    () =>
      SCENARIOS.map((entry) => ({
        scenario: entry,
        selectable: canSelectScenario(entry.id, institute, meta.scenarioId),
        unlocked: isScenarioUnlocked(entry.id, institute),
        hint: scenarioLockHint(entry.id),
      })),
    [institute, meta.scenarioId],
  )
  const lockedHints = scenarioOptions
    .filter((entry) => !entry.selectable && entry.hint)
    .map((entry) => `${entry.scenario.label}: ${entry.hint}`)

  const handleClearStamp = useCallback(() => clearStamp(), [clearStamp])
  const handleChooseLeft = useCallback(() => {
    telegramImpact('medium')
    choose('left')
  }, [choose])
  const handleChooseRight = useCallback(() => {
    telegramImpact('medium')
    choose('right')
  }, [choose])

  useEffect(() => initTelegramMiniApp(), [])

  const left = card?.left
  const right = card?.right
  const isMobile = useMediaQuery('(max-width: 899px)')

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">ФГУП «ПОЧАХО» — закрытое направление</h1>
        <div className="app-menu">
          <label className="app-menu__label" htmlFor="scenario-select">
            Тематика
          </label>
          <select
            id="scenario-select"
            className="app-menu__select"
            value={scenario.id}
            onChange={(e) => setScenario(e.target.value)}
            aria-label="Выбор тематики"
          >
            {scenarioOptions.map(({ scenario: scenarioOption, selectable, unlocked }) => (
              <option key={scenarioOption.id} value={scenarioOption.id} disabled={!selectable}>
                {unlocked ? scenarioOption.label : `${scenarioOption.label} (закрыто)`}
              </option>
            ))}
          </select>
          {lockedHints.length > 0 ? <p className="app-menu__note">{lockedHints[0]}</p> : null}
          {!isScenarioUnlocked(scenario.id, institute) ? (
            <p className="app-menu__note">Текущий сценарий продолжается по сохранению, даже если он сейчас закрыт.</p>
          ) : null}
        </div>
      </header>
      <StatusBars meters={meters} />
      {isMobile ? (
        <div className="mobile-tabs" role="tablist" aria-label="Экран">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'card'}
            className={`mobile-tabs__tab ${mobileTab === 'card' ? 'mobile-tabs__tab--active' : ''}`}
            onClick={() => setMobileTab('card')}
          >
            Карточка
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'dossier'}
            className={`mobile-tabs__tab ${mobileTab === 'dossier' ? 'mobile-tabs__tab--active' : ''}`}
            onClick={() => setMobileTab('dossier')}
          >
            Досье
          </button>
        </div>
      ) : null}
      <main className="app-shell__main">
        {isMobile ? (
          mobileTab === 'dossier' ? (
            <div className="app-shell__side">
              <FacilityDossier open={true} model={dossierModel} onToggle={toggleDossier} />
            </div>
          ) : (
            <div className="app-shell__center">
              <DecisionCard card={card} />
            </div>
          )
        ) : (
          <>
            <div className="app-shell__center">
              <DecisionCard card={card} />
            </div>
            <div className="app-shell__side">
              <FacilityDossier open={dossierOpen} model={dossierModel} onToggle={toggleDossier} />
            </div>
          </>
        )}
      </main>

      <div className="decisions" role="group" aria-label="Решение">
        <button
          type="button"
          className="decision-btn"
          onClick={handleChooseLeft}
          disabled={phase !== 'playing' || !left}
        >
          <span className="decision-btn__label">{left?.label ?? '—'}</span>
          <span className="decision-btn__hint">{left?.previewHint ?? 'Нет данных'}</span>
        </button>
        <button
          type="button"
          className="decision-btn"
          onClick={handleChooseRight}
          disabled={phase !== 'playing' || !right}
        >
          <span className="decision-btn__label">{right?.label ?? '—'}</span>
          <span className="decision-btn__hint">{right?.previewHint ?? 'Нет данных'}</span>
        </button>
      </div>

      <StampFeedback message={stampMessage} onDone={handleClearStamp} />

      {phase === 'ended' && endingId ? (
        <EndingScreen endingId={endingId} rewards={endingRewards} onRestart={newGame} />
      ) : null}
    </div>
  )
}
