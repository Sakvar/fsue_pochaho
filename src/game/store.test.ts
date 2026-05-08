import { describe, expect, it } from 'vitest'
import { INITIAL_RESOURCES } from '@/game/constants'
import { migratePersistedState } from '@/game/store'

describe('store migration', () => {
  it('creates default institute for old saves', () => {
    const migrated = migratePersistedState(
      {
        resources: { ...INITIAL_RESOURCES },
        flags: {},
        meta: { turn: 4, year: 1983, runId: 'legacy', scenarioId: 'pochaho_classic' },
        phase: 'playing',
        endingId: null,
        currentCardId: 'fb_memo_routing',
        lastCardId: null,
        history: [],
      },
      3,
    )

    expect(migrated.institute?.level).toBe(1)
    expect(migrated.institute?.completedRuns).toBe(0)
    expect(migrated.institute?.unlockedDepartments).toEqual(['theory_lab', 'supply_office'])
    expect(migrated.meta?.endingRewardsApplied).toBe(false)
  })

  it('backfills missing scenario and ending reward metadata', () => {
    const migrated = migratePersistedState(
      {
        resources: { ...INITIAL_RESOURCES },
        flags: {},
        meta: { turn: 1, year: 1983, runId: 'legacy-no-scenario' },
        phase: 'ended',
        endingId: 'lose_funding',
        currentCardId: 'fb_memo_routing',
        lastCardId: null,
        history: [],
      },
      2,
    )

    expect(migrated.meta?.scenarioId).toBe('pochaho_classic')
    expect(migrated.meta?.endingRewardsApplied).toBe(true)
  })
})
