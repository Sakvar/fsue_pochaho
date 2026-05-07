import { describe, expect, it } from 'vitest'
import { createEmptyState } from '@/game/logic'
import { evaluateEnding } from '@/game/endings'
import { DEFAULT_SCENARIO_ID } from '@/game/scenarios'

describe('evaluateEnding', () => {
  it('detects loyalty failure', () => {
    const s = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    s.resources.personnelLoyalty = 0
    expect(evaluateEnding(s)).toBe('lose_loyalty')
  })

  it('detects KGB failure at ceiling', () => {
    const s = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    s.resources.kgbAttention = 100
    expect(evaluateEnding(s)).toBe('lose_kgb')
  })

  it('detects scientific victory before stagnation', () => {
    const s = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    s.resources.scientificProgress = 100
    s.meta.turn = 500
    expect(evaluateEnding(s)).toBe('win_breakthrough')
  })

  it('detects absurd promotion flag', () => {
    const s = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    s.flags.absurd_promotion = true
    expect(evaluateEnding(s)).toBe('win_promotion')
  })

  it('prefers failure over victory when both match', () => {
    const s = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    s.resources.funding = 0
    s.resources.scientificProgress = 100
    expect(evaluateEnding(s)).toBe('lose_funding')
  })
})
