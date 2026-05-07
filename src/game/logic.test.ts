import { describe, expect, it } from 'vitest'
import { INITIAL_RESOURCES, RESOURCE_MAX, RESOURCE_MIN } from '@/game/constants'
import { applyEffects, clampResource, createEmptyState } from '@/game/logic'
import { DEFAULT_SCENARIO_ID } from '@/game/scenarios'

describe('clampResource', () => {
  it('clamps to bounds', () => {
    expect(clampResource(-5)).toBe(RESOURCE_MIN)
    expect(clampResource(150)).toBe(RESOURCE_MAX)
    expect(clampResource(33.2)).toBe(33)
  })
})

describe('applyEffects', () => {
  it('applies resource deltas with clamping', () => {
    const base = createEmptyState('test', DEFAULT_SCENARIO_ID, 1983)
    const next = applyEffects(base, { resources: { funding: 60, secrecy: -120 } })
    expect(next.resources.funding).toBe(RESOURCE_MAX)
    expect(next.resources.secrecy).toBe(RESOURCE_MIN)
  })

  it('applies flag operations', () => {
    const base = createEmptyState('test', DEFAULT_SCENARIO_ID, 1983)
    const withFlags = applyEffects(base, { flags: { a: true, n: 2 } })
    expect(withFlags.flags.a).toBe(true)
    expect(withFlags.flags.n).toBe(2)
    const toggled = applyEffects(withFlags, { flags: { a: 'toggle' } })
    expect(toggled.flags.a).toBe(false)
  })

  it('preserves unspecified resources', () => {
    const base = createEmptyState('test', DEFAULT_SCENARIO_ID, 1983)
    const next = applyEffects(base, { resources: { funding: -5 } })
    expect(next.resources.personnelLoyalty).toBe(INITIAL_RESOURCES.personnelLoyalty)
  })
})
