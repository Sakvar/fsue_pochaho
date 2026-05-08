import { describe, expect, it } from 'vitest'
import { createEmptyState } from '@/game/logic'
import { applyEndingRewards } from '@/game/rewards'
import { DEFAULT_SCENARIO_ID } from '@/game/scenarios'

describe('applyEndingRewards', () => {
  it('applies rewards once and stays idempotent', () => {
    const base = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    const ended = { ...base, phase: 'ended' as const, endingId: 'win_breakthrough' }

    const once = applyEndingRewards(ended, 'win_breakthrough')
    expect(once.institute.completedRuns).toBe(1)
    expect(once.meta.endingRewardsApplied).toBe(true)
    expect(once.institute.archive).toContain('ending:win_breakthrough')

    const twice = applyEndingRewards(once, 'win_breakthrough')
    expect(twice.institute.completedRuns).toBe(1)
    expect(twice.institute.archive.filter((entry) => entry === 'ending:win_breakthrough')).toHaveLength(1)
    expect(twice.endingRewards?.archiveEntries).toEqual(['ending:win_breakthrough'])
  })
})
