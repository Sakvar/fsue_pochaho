import { describe, expect, it } from 'vitest'
import { createDefaultInstituteState } from '@/game/institute'
import { ROSNANO_SCENARIO_ARCHIVE_UNLOCK, canSelectScenario, isScenarioUnlocked } from '@/game/scenarios'

describe('scenario unlocks', () => {
  it('keeps classic open and gates others by run count', () => {
    const institute = createDefaultInstituteState()
    expect(isScenarioUnlocked('pochaho_classic', institute)).toBe(true)
    expect(isScenarioUnlocked('pochaho_late_start', institute)).toBe(false)
    expect(isScenarioUnlocked('pochaho_rosnano_2011', institute)).toBe(false)

    institute.completedRuns = 1
    expect(isScenarioUnlocked('pochaho_late_start', institute)).toBe(true)
    expect(isScenarioUnlocked('pochaho_rosnano_2011', institute)).toBe(false)

    institute.completedRuns = 2
    expect(isScenarioUnlocked('pochaho_rosnano_2011', institute)).toBe(true)
  })

  it('unlocks rosnano scenario by archive trigger', () => {
    const institute = createDefaultInstituteState()
    institute.archive.push(ROSNANO_SCENARIO_ARCHIVE_UNLOCK)
    expect(isScenarioUnlocked('pochaho_rosnano_2011', institute)).toBe(true)
  })

  it('allows current scenario continuation even when locked now', () => {
    const institute = createDefaultInstituteState()
    expect(canSelectScenario('pochaho_rosnano_2011', institute, 'pochaho_rosnano_2011')).toBe(true)
    expect(canSelectScenario('pochaho_rosnano_2011', institute, 'pochaho_classic')).toBe(false)
  })
})
