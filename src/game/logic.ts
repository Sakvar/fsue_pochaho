import type { CardEffects } from '@/data/types'
import {
  INITIAL_RESOURCES,
  RESOURCE_MAX,
  RESOURCE_MIN,
  TURNS_PER_YEAR,
} from '@/game/constants'
import { createDefaultInstituteState, mergeUnique, normalizeInstituteState } from '@/game/institute'
import { applyProjectEffects } from '@/game/projects'
import type { GameState, Resources } from '@/game/types'

export function clampResource(value: number): number {
  return Math.min(RESOURCE_MAX, Math.max(RESOURCE_MIN, Math.round(value)))
}

export function applyResourceDelta(resources: Resources, key: keyof Resources, delta: number): Resources {
  return {
    ...resources,
    [key]: clampResource(resources[key] + delta),
  }
}

function applyFlagValue(
  flags: Record<string, boolean | number>,
  key: string,
  effect: boolean | number | 'toggle',
): Record<string, boolean | number> {
  const next = { ...flags }
  if (effect === 'toggle') {
    const cur = next[key]
    if (typeof cur === 'boolean') {
      next[key] = !cur
    } else if (typeof cur === 'number') {
      next[key] = cur === 0 ? 1 : 0
    } else {
      next[key] = true
    }
    return next
  }
  next[key] = effect
  return next
}

export function applyEffects(state: GameState, effects: CardEffects): GameState {
  let resources = { ...state.resources }
  if (effects.resources) {
    for (const [k, delta] of Object.entries(effects.resources)) {
      if (delta === undefined) continue
      resources = applyResourceDelta(resources, k as keyof Resources, delta)
    }
  }
  let flags = { ...state.flags }
  if (effects.flags) {
    for (const [k, effect] of Object.entries(effects.flags)) {
      flags = applyFlagValue(flags, k, effect)
    }
  }
  let institute = state.institute
  if (effects.institute) {
    institute = {
      ...institute,
      reputation: institute.reputation + (effects.institute.reputation ?? 0),
      unlockedDepartments: mergeUnique(institute.unlockedDepartments, effects.institute.unlockDepartments),
      unlockedTechnologies: mergeUnique(institute.unlockedTechnologies, effects.institute.unlockTechnologies),
      archive: mergeUnique(institute.archive, effects.institute.archiveEntries),
    }
  }
  const projects = applyProjectEffects(institute.projects, effects.projects)
  if (projects !== institute.projects) {
    institute = { ...institute, projects }
  }
  return { ...state, resources, flags, institute }
}

export function advanceMeta(state: GameState): GameState {
  const turn = state.meta.turn + 1
  const extraYears = Math.floor(turn / TURNS_PER_YEAR) - Math.floor((turn - 1) / TURNS_PER_YEAR)
  const year = state.meta.year + extraYears
  return {
    ...state,
    meta: { ...state.meta, turn, year },
  }
}

export function createEmptyState(
  runId: string,
  scenarioId: string,
  startYear: number,
  instituteState = createDefaultInstituteState(),
): GameState {
  return {
    resources: { ...INITIAL_RESOURCES },
    flags: {},
    institute: normalizeInstituteState(instituteState),
    meta: { turn: 0, year: startYear, runId, scenarioId, endingRewardsApplied: false },
    phase: 'playing',
    endingId: null,
    endingRewards: null,
    currentCardId: '',
    lastCardId: null,
    history: [],
  }
}
