import { CARDS, CARDS_BY_ID } from '@/data/cards'
import { HISTORY_LIMIT, STAMP_MESSAGES } from '@/game/constants'
import { pickNextCard } from '@/game/cardEngine'
import { evaluateEnding } from '@/game/endings'
import { advanceMeta, applyEffects, createEmptyState } from '@/game/logic'
import type { ChoiceSide, GameState } from '@/game/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type GameStore = GameState & {
  dossierOpen: boolean
  stampMessage: string | null
  choose: (choice: ChoiceSide) => void
  newGame: () => void
  toggleDossier: () => void
  clearStamp: () => void
}

function randomStamp(): string {
  const idx = Math.floor(Math.random() * STAMP_MESSAGES.length)
  return STAMP_MESSAGES[idx] ?? 'ЗАРЕГИСТРИРОВАНО'
}

export function bootstrapState(runId: string): GameState {
  const empty = createEmptyState(runId)
  const firstId = pickNextCard(empty, CARDS, Math.random)
  return { ...empty, currentCardId: firstId }
}

function newRunId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'offline-run'
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...bootstrapState(newRunId()),
      dossierOpen: true,
      stampMessage: null,
      choose: (choice) => {
        const state = get()
        if (state.phase !== 'playing') return
        const card = CARDS_BY_ID[state.currentCardId]
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
          set({ ...next, phase: 'ended', endingId, stampMessage: stamp })
          return
        }
        const forced = card.followUp?.[choice]
        const nextCardId = forced ?? pickNextCard(next, CARDS, Math.random)
        set({ ...next, currentCardId: nextCardId, stampMessage: stamp })
      },
      newGame: () =>
        set({
          ...bootstrapState(newRunId()),
          dossierOpen: get().dossierOpen,
          stampMessage: null,
        }),
      toggleDossier: () => set((s) => ({ dossierOpen: !s.dossierOpen })),
      clearStamp: () => set({ stampMessage: null }),
    }),
    {
      name: 'pochaho-save',
      version: 1,
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
      }),
    },
  ),
)
