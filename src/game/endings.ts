import { ENDING_DEFINITIONS, type EndingMatch } from '@/data/endings'
import { isFlagTruthy } from '@/game/cardEngine'
import type { GameState } from '@/game/types'

function matches(state: GameState, m: EndingMatch): boolean {
  switch (m.op) {
    case 'resourceLte':
      return state.resources[m.key] <= m.value
    case 'resourceGte':
      return state.resources[m.key] >= m.value
    case 'turnGte':
      return state.meta.turn >= m.value
    case 'flagTrue':
      return isFlagTruthy(state.flags, m.key)
    case 'all':
      return m.items.every((x) => matches(state, x))
    default: {
      const _exhaustive: never = m
      return _exhaustive
    }
  }
}

export function evaluateEnding(state: GameState): string | null {
  if (state.phase === 'ended') return state.endingId
  const ordered = [...ENDING_DEFINITIONS].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'failure' ? -1 : 1
    return a.priority - b.priority
  })
  for (const e of ordered) {
    if (matches(state, e.match)) return e.id
  }
  return null
}

export function getEndingCopy(id: string) {
  return ENDING_DEFINITIONS.find((e) => e.id === id) ?? null
}
