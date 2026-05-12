import { trackGameStart } from '@/analytics'
import { AboutSupportPanel } from '@/components/AboutSupportPanel'
import { AppFooter } from '@/components/AppFooter'
import { DecisionButtons } from '@/components/DecisionButtons'
import { DecisionCard } from '@/components/DecisionCard'
import { EndingsArchiveSection } from '@/components/EndingsArchiveSection'
import { EndingScreen } from '@/components/EndingScreen'
import { FacilityDossier } from '@/components/FacilityDossier'
import { LegalDocModal, type LegalDocId } from '@/components/LegalDocModal'
import { StampFeedback } from '@/components/StampFeedback'
import { StatusBars } from '@/components/StatusBars'
import { buildDossierView } from '@/game/dossierCopy'
import { canSelectScenario, getScenario, isScenarioUnlocked, scenarioLockHint, SCENARIOS } from '@/game/scenarios'
import { selectCurrentCard, selectMeters } from '@/game/selectors'
import { useGameStore } from '@/game/store'
import { initTelegramMiniApp, telegramImpact } from '@/integrations/telegram'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [scenarioMenuOpen, setScenarioMenuOpen] = useState(true)
  const [archiveMenuOpen, setArchiveMenuOpen] = useState(false)
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const sessionTracked = useRef(false)

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
        hint: scenarioLockHint(entry.id) ?? 'Доступен сразу.',
      })),
    [institute, meta.scenarioId],
  )

  const handleClearStamp = useCallback(() => clearStamp(), [clearStamp])
  const handleOpenMenu = useCallback(() => setMenuOpen(true), [])
  const handleCloseMenu = useCallback(() => setMenuOpen(false), [])
  const handleChooseScenario = useCallback(
    (scenarioId: string, selectable: boolean) => {
      if (!selectable) return
      setScenario(scenarioId)
      setMenuOpen(false)
    },
    [setScenario],
  )
  const handleChooseLeft = useCallback(() => {
    telegramImpact('medium')
    choose('left')
  }, [choose])
  const handleChooseRight = useCallback(() => {
    telegramImpact('medium')
    choose('right')
  }, [choose])

  useEffect(() => initTelegramMiniApp(), [])

  useEffect(() => {
    if (sessionTracked.current) return
    sessionTracked.current = true
    trackGameStart('app_mount', useGameStore.getState().meta.scenarioId)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const left = card?.left
  const right = card?.right
  const isMobile = useMediaQuery('(max-width: 899px)')

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">ФГУП «ПОЧАХО» — закрытое направление</h1>
        <div className="app-menu">
          <button
            type="button"
            className="app-menu__button"
            onClick={handleOpenMenu}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
          >
            Меню
          </button>
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
              <DecisionButtons
                phase={phase}
                left={left}
                right={right}
                onChooseLeft={handleChooseLeft}
                onChooseRight={handleChooseRight}
                variant="inline"
              />
            </div>
            <div className="app-shell__side">
              <FacilityDossier open={dossierOpen} model={dossierModel} onToggle={toggleDossier} />
            </div>
          </>
        )}
      </main>

      {isMobile ? (
        <DecisionButtons
          phase={phase}
          left={left}
          right={right}
          onChooseLeft={handleChooseLeft}
          onChooseRight={handleChooseRight}
          variant="fixed"
        />
      ) : null}

      <StampFeedback message={stampMessage} onDone={handleClearStamp} />

      <AppFooter
        onOpenLegal={(doc) => setLegalDoc(doc)}
        onOpenAbout={() => {
          setAboutOpen(true)
        }}
      />

      {menuOpen ? (
        <div className="menu-popup-layer" role="dialog" aria-modal="true" aria-labelledby="menu-title" onClick={handleCloseMenu}>
          <div className="menu-popup" onClick={(event) => event.stopPropagation()}>
            <div className="menu-popup__header">
              <h2 id="menu-title" className="menu-popup__title">
                Служебное меню
              </h2>
              <button type="button" className="menu-popup__close" onClick={handleCloseMenu} aria-label="Закрыть меню">
                Закрыть
              </button>
            </div>
            <section className="menu-popup__section">
              <button
                type="button"
                className="menu-popup__submenu-toggle"
                onClick={() => setScenarioMenuOpen((value) => !value)}
                aria-expanded={scenarioMenuOpen}
              >
                Сценарии
              </button>
              {scenarioMenuOpen ? (
                <ul className="menu-popup__scenario-list">
                  {scenarioOptions.map(({ scenario: scenarioOption, selectable, unlocked, hint }) => {
                    const isCurrent = scenarioOption.id === scenario.id
                    return (
                      <li key={scenarioOption.id} className="menu-popup__scenario-item">
                        <button
                          type="button"
                          className="menu-popup__scenario-button"
                          onClick={() => handleChooseScenario(scenarioOption.id, selectable)}
                          disabled={!selectable}
                        >
                          {scenarioOption.label}
                          {isCurrent ? ' (текущий)' : ''}
                          {!unlocked ? ' [закрыт]' : ''}
                        </button>
                        <p className="menu-popup__scenario-hint">
                          Условие: {hint}
                          {!unlocked && isCurrent
                            ? ' Текущий запуск можно продолжать из сохранения.'
                            : ''}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </section>

            <section className="menu-popup__section">
              <button
                type="button"
                className="menu-popup__submenu-toggle"
                onClick={() => setArchiveMenuOpen((value) => !value)}
                aria-expanded={archiveMenuOpen}
              >
                Архив исходов
              </button>
              {archiveMenuOpen ? <EndingsArchiveSection archive={institute.archive} /> : null}
            </section>
          </div>
        </div>
      ) : null}

      {legalDoc ? <LegalDocModal doc={legalDoc} onClose={() => setLegalDoc(null)} /> : null}
      {aboutOpen ? <AboutSupportPanel onClose={() => setAboutOpen(false)} /> : null}

      {phase === 'ended' && endingId ? (
        <EndingScreen
          endingId={endingId}
          rewards={endingRewards}
          onRestart={newGame}
          shareMeta={{
            scenarioLabel: scenario.label,
            secrecy: resources.secrecy,
            completedRuns: institute.completedRuns,
          }}
        />
      ) : null}
    </div>
  )
}
