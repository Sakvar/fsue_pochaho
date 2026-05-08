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

  it('applies institute reputation and deduplicates unlocks', () => {
    const base = createEmptyState('test', DEFAULT_SCENARIO_ID, 1983)
    const next = applyEffects(base, {
      institute: {
        reputation: 2,
        unlockDepartments: ['anomaly_lab', 'theory_lab'],
        unlockTechnologies: ['tech_a', 'tech_a'],
        archiveEntries: ['archive:a', 'archive:a'],
      },
    })
    expect(next.institute.reputation).toBe(2)
    expect(next.institute.unlockedDepartments).toContain('theory_lab')
    expect(next.institute.unlockedDepartments).toContain('anomaly_lab')
    expect(next.institute.unlockedDepartments.filter((x) => x === 'theory_lab')).toHaveLength(1)
    expect(next.institute.unlockedTechnologies).toEqual(['tech_a'])
    expect(next.institute.archive).toEqual(['archive:a'])
  })

  it('clamps project progress and risk and auto-completes', () => {
    const base = createEmptyState('test', DEFAULT_SCENARIO_ID, 1983)
    base.institute.projects.lunar_program = {
      ...base.institute.projects.lunar_program,
      status: 'active',
      progress: 90,
      risk: 95,
    }
    const next = applyEffects(base, {
      projects: {
        lunar_program: { progress: 20, risk: 20 },
      },
    })
    expect(next.institute.projects.lunar_program.progress).toBe(100)
    expect(next.institute.projects.lunar_program.risk).toBe(100)
    expect(next.institute.projects.lunar_program.status).toBe('completed')
  })

  it('does not override explicit failed status when progress reaches threshold', () => {
    const base = createEmptyState('test', DEFAULT_SCENARIO_ID, 1983)
    base.institute.projects.anomaly_containment = {
      ...base.institute.projects.anomaly_containment,
      status: 'active',
      progress: 95,
      risk: 20,
    }
    const next = applyEffects(base, {
      projects: {
        anomaly_containment: { progress: 12, status: 'failed' },
      },
    })
    expect(next.institute.projects.anomaly_containment.progress).toBe(100)
    expect(next.institute.projects.anomaly_containment.status).toBe('failed')
  })
})
