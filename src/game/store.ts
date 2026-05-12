import { trackCardChoice, trackEnding, trackGameStart, trackScenarioChange } from '@/analytics'
import type { Card } from '@/data/types'
import { HISTORY_LIMIT, STAMP_MESSAGES } from '@/game/constants'
import { pickNextCard } from '@/game/cardEngine'
import { evaluateEnding } from '@/game/endings'
import { createDefaultInstituteState, normalizeInstituteState } from '@/game/institute'
import { advanceMeta, applyEffects, createEmptyState } from '@/game/logic'
import { applyEndingRewards } from '@/game/rewards'
import { canSelectScenario, DEFAULT_SCENARIO_ID, getScenario } from '@/game/scenarios'
import type { ChoiceSide, GameState, InstituteState } from '@/game/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type GameStore = GameState & {
  cards: Card[]
  cardsById: Record<string, Card>
  dossierOpen: boolean
  mobileTab: 'card' | 'dossier'
  stampMessage: string | null
  choose: (choice: ChoiceSide) => void
  newGame: () => void
  setScenario: (scenarioId: string) => void
  toggleDossier: () => void
  setMobileTab: (tab: 'card' | 'dossier') => void
  clearStamp: () => void
}

function buildCardsById(cards: Card[]): Record<string, Card> {
  return Object.fromEntries(cards.map((card) => [card.id, card]))
}

function randomStamp(): string {
  const idx = Math.floor(Math.random() * STAMP_MESSAGES.length)
  return STAMP_MESSAGES[idx] ?? 'ЗАРЕГИСТРИРОВАНО'
}

export function bootstrapState(
  runId: string,
  scenarioId: string,
  institute: InstituteState = createDefaultInstituteState(),
): GameState & { cards: Card[]; cardsById: Record<string, Card> } {
  const scenario = getScenario(scenarioId)
  const empty = createEmptyState(runId, scenario.id, scenario.startYear, institute)
  const cards = scenario.cards
  const cardsById = buildCardsById(cards)
  const firstId = pickNextCard(empty, cards, Math.random)
  return { ...empty, currentCardId: firstId, cards, cardsById }
}

function newRunId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'offline-run'
}

type PersistedStore = Partial<GameStore>

export function migratePersistedState(persisted: unknown, version: number): PersistedStore {
  const state = persisted as PersistedStore | undefined
  if (!state) return {}
  let migrated: PersistedStore = { ...state }

  if (version < 2 && !migrated.mobileTab) {
    migrated = { ...migrated, mobileTab: 'card' }
  }
  if (version < 3) {
    const nextMeta = migrated.meta ? { ...migrated.meta, scenarioId: DEFAULT_SCENARIO_ID } : undefined
    migrated = { ...migrated, meta: nextMeta }
  }

  const currentMeta = migrated.meta as Partial<GameState['meta']> | undefined
  migrated.meta = {
    turn: typeof currentMeta?.turn === 'number' ? currentMeta.turn : 0,
    year: typeof currentMeta?.year === 'number' ? currentMeta.year : getScenario(DEFAULT_SCENARIO_ID).startYear,
    runId: currentMeta?.runId ?? newRunId(),
    scenarioId: currentMeta?.scenarioId ?? DEFAULT_SCENARIO_ID,
    endingRewardsApplied:
      typeof currentMeta?.endingRewardsApplied === 'boolean'
        ? currentMeta.endingRewardsApplied
        : migrated.phase === 'ended',
  }

  migrated.institute = normalizeInstituteState(migrated.institute as Partial<InstituteState> | undefined)
  migrated.endingRewards = migrated.endingRewards ?? null

  if (!migrated.mobileTab) {
    migrated.mobileTab = 'card'
  }
  return migrated
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...bootstrapState(newRunId(), DEFAULT_SCENARIO_ID),
      dossierOpen: true,
      mobileTab: 'card',
      stampMessage: null,
      choose: (choice) => {
        const state = get()
        if (state.phase !== 'playing') return
        const card = state.cardsById[state.currentCardId]
        if (!card) return
        const option = choice === 'left' ? card.left : card.right
        trackCardChoice({ cardId: card.id, side: choice })
        let next = applyEffects(state, option.effects)
        next = advanceMeta(next)
        const history = [...next.history, { cardId: card.id, choice }]
        if (history.length > HISTORY_LIMIT) history.shift()
        next = { ...next, history, lastCardId: card.id }
        const endingId = evaluateEnding(next)
        const stamp = option.stamp ?? randomStamp()
        if (endingId) {
          trackEnding({ endingId })
          const ended = applyEndingRewards({ ...next, phase: 'ended', endingId }, endingId)
          set({ ...ended, stampMessage: stamp, cards: state.cards, cardsById: state.cardsById })
          return
        }
        const forced = card.followUp?.[choice]
        const nextCardId = forced ?? pickNextCard(next, state.cards, Math.random)
        set({ ...next, currentCardId: nextCardId, stampMessage: stamp, cards: state.cards, cardsById: state.cardsById })
      },
      newGame: () => {
        trackGameStart('new_run')
        set({
          ...bootstrapState(newRunId(), get().meta.scenarioId, get().institute),
          dossierOpen: get().dossierOpen,
          mobileTab: get().mobileTab,
          stampMessage: null,
        })
      },
      setScenario: (scenarioId) => {
        const state = get()
        if (!canSelectScenario(scenarioId, state.institute, state.meta.scenarioId)) return
        trackScenarioChange({ fromScenarioId: state.meta.scenarioId, toScenarioId: scenarioId })
        set({
          ...bootstrapState(newRunId(), scenarioId, state.institute),
          dossierOpen: state.dossierOpen,
          mobileTab: state.mobileTab,
          stampMessage: null,
        })
      },
      toggleDossier: () => set((s) => ({ dossierOpen: !s.dossierOpen })),
      setMobileTab: (tab) => set({ mobileTab: tab }),
      clearStamp: () => set({ stampMessage: null }),
    }),
    {
      name: 'pochaho-save',
      version: 4,
      migrate: migratePersistedState,
      partialize: (state) => ({
        resources: state.resources,
        flags: state.flags,
        institute: state.institute,
        meta: state.meta,
        phase: state.phase,
        endingId: state.endingId,
        endingRewards: state.endingRewards,
        currentCardId: state.currentCardId,
        lastCardId: state.lastCardId,
        history: state.history,
        dossierOpen: state.dossierOpen,
        mobileTab: state.mobileTab,
      }),
    },
  ),
)
