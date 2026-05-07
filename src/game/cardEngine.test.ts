import { describe, expect, it } from 'vitest'
import type { Card } from '@/data/types'
import { createEmptyState } from '@/game/logic'
import { getEligibleCards, isCardEligible, pickNextCard } from '@/game/cardEngine'
import { DEFAULT_SCENARIO_ID } from '@/game/scenarios'

const catalog: Card[] = [
  {
    id: 'always',
    title: 'A',
    speaker: 'S',
    body: 'B',
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
  {
    id: 'needs_flag',
    title: 'N',
    speaker: 'S',
    body: 'B',
    requiresFlags: ['gate'],
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
  {
    id: 'blocked_when_flag',
    title: 'X',
    speaker: 'S',
    body: 'B',
    blocksFlags: ['gate'],
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
  {
    id: 'conditional',
    title: 'C',
    speaker: 'S',
    body: 'B',
    conditions: { minResource: { funding: 60 } },
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
  {
    id: 'fallback',
    title: 'F',
    speaker: 'S',
    body: 'B',
    tags: ['fallback'],
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
]

describe('cardEngine', () => {
  it('filters requiresFlags and blocksFlags', () => {
    const base = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    const open = getEligibleCards(base, catalog).map((c) => c.id)
    expect(open).toContain('always')
    expect(open).not.toContain('needs_flag')
    base.flags.gate = true
    const gated = getEligibleCards(base, catalog).map((c) => c.id)
    expect(gated).toContain('needs_flag')
    expect(gated).not.toContain('blocked_when_flag')
  })

  it('filters resource conditions', () => {
    const base = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    expect(isCardEligible(base, catalog.find((c) => c.id === 'conditional')!)).toBe(false)
    base.resources.funding = 60
    expect(isCardEligible(base, catalog.find((c) => c.id === 'conditional')!)).toBe(true)
  })

  it('pickNextCard returns a valid id', () => {
    const base = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    const id = pickNextCard(base, catalog, () => 0.5)
    expect(catalog.some((c) => c.id === id)).toBe(true)
  })
})
