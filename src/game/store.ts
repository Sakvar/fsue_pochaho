import type { Card } from '@/data/types'
import { HISTORY_LIMIT, STAMP_MESSAGES } from '@/game/constants'
import { pickNextCard } from '@/game/cardEngine'
import { evaluateEnding } from '@/game/endings'
import { advanceMeta, applyEffects, createEmptyState } from '@/game/logic'
import { DEFAULT_SCENARIO_ID, getScenario } from '@/game/scenarios'
import type { ChoiceSide, GameState } from '@/game/types'
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

export function bootstrapState(runId: string, scenarioId: string): GameState & { cards: Card[]; cardsById: Record<string, Card> } {
  const scenario = getScenario(scenarioId)
  const empty = createEmptyState(runId, scenario.id, scenario.startYear)
  const cards = scenario.cards
  const cardsById = buildCardsById(cards)
  const firstId = pickNextCard(empty, cards, Math.random)
  return { ...empty, currentCardId: firstId, cards, cardsById }
}

function newRunId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'offline-run'
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
        let next = applyEffects(state, option.effects)
        next = advanceMeta(next)
        const history = [...next.history, { cardId: card.id, choice }]
        if (history.length > HISTORY_LIMIT) history.shift()
        next = { ...next, history, lastCardId: card.id }
        const endingId = evaluateEnding(next)
        const stamp = option.stamp ?? randomStamp()
        if (endingId) {
          set({ ...next, phase: 'ended', endingId, stampMessage: stamp, cards: state.cards, cardsById: state.cardsById })
          return
        }
        const forced = card.followUp?.[choice]
        const nextCardId = forced ?? pickNextCard(next, state.cards, Math.random)
        set({ ...next, currentCardId: nextCardId, stampMessage: stamp, cards: state.cards, cardsById: state.cardsById })
      },
      newGame: () =>
        set({
          ...bootstrapState(newRunId(), get().meta.scenarioId),
          dossierOpen: get().dossierOpen,
          mobileTab: get().mobileTab,
          stampMessage: null,
        }),
      setScenario: (scenarioId) =>
        set({
          ...bootstrapState(newRunId(), scenarioId),
          dossierOpen: get().dossierOpen,
          mobileTab: get().mobileTab,
          stampMessage: null,
        }),
      toggleDossier: () => set((s) => ({ dossierOpen: !s.dossierOpen })),
      setMobileTab: (tab) => set({ mobileTab: tab }),
      clearStamp: () => set({ stampMessage: null }),
    }),
    {
      name: 'pochaho-save',
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as Partial<GameStore> | undefined
        if (!state) return persisted as GameStore
        if (version < 2) {
          return {
            ...state,
            mobileTab: 'card',
          } as GameStore
        }
        if (version < 3) {
          const nextMeta = state.meta ? { ...state.meta, scenarioId: DEFAULT_SCENARIO_ID } : undefined
          return {
            ...state,
            meta: nextMeta,
          } as GameStore
        }
        if (!state.meta?.scenarioId) {
          return { ...state, meta: { ...(state.meta as GameState['meta']), scenarioId: DEFAULT_SCENARIO_ID } } as GameStore
        }
        if (!state.mobileTab) {
          return { ...state, mobileTab: 'card' } as GameStore
        }
        return persisted as GameStore
      },
      partialize: (state) => ({
        resources: state.resources,
        flags: state.flags,
        meta: state.meta,
        phase: state.phase,
        endingId: state.endingId,
        currentCardId: state.currentCardId,
        lastCardId: state.lastCardId,
        history: state.history,
        dossierOpen: state.dossierOpen,
        mobileTab: state.mobileTab,
      }),
    },
  ),
)
