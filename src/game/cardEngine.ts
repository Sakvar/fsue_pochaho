import type { Card } from '@/data/types'
import type { GameState } from '@/game/types'
import { pickWeightedIndex, type Rng } from '@/game/rng'

export function isFlagTruthy(flags: Record<string, boolean | number>, key: string): boolean {
  if (!(key in flags)) return false
  const v = flags[key]
  if (typeof v === 'boolean') return v
  return v !== 0
}

function matchesConditions(state: GameState, card: Card): boolean {
  const c = card.conditions
  if (!c) return true
  if (c.turnGte !== undefined && state.meta.turn < c.turnGte) return false
  if (c.minResource) {
    for (const [k, min] of Object.entries(c.minResource)) {
      if (min === undefined) continue
      if (state.resources[k as keyof typeof state.resources] < min) return false
    }
  }
  if (c.maxResource) {
    for (const [k, max] of Object.entries(c.maxResource)) {
      if (max === undefined) continue
      if (state.resources[k as keyof typeof state.resources] > max) return false
    }
  }
  if (c.hasFlag) {
    for (const key of c.hasFlag) {
      if (!isFlagTruthy(state.flags, key)) return false
    }
  }
  if (c.missingFlag) {
    for (const key of c.missingFlag) {
      if (isFlagTruthy(state.flags, key)) return false
    }
  }
  if (c.requiresDepartment) {
    for (const departmentId of c.requiresDepartment) {
      if (!state.institute.unlockedDepartments.includes(departmentId)) return false
    }
  }
  if (c.requiresProjectStatus) {
    for (const [projectId, status] of Object.entries(c.requiresProjectStatus)) {
      if (!status) continue
      if (state.institute.projects[projectId as keyof typeof state.institute.projects]?.status !== status) return false
    }
  }
  if (c.hasArchiveEntry) {
    for (const archiveEntry of c.hasArchiveEntry) {
      if (!state.institute.archive.includes(archiveEntry)) return false
    }
  }
  if (c.missingArchiveEntry) {
    for (const archiveEntry of c.missingArchiveEntry) {
      if (state.institute.archive.includes(archiveEntry)) return false
    }
  }
  return true
}

function matchesFlagRequirements(state: GameState, card: Card): boolean {
  if (card.requiresFlags) {
    for (const key of card.requiresFlags) {
      if (!isFlagTruthy(state.flags, key)) return false
    }
  }
  if (card.blocksFlags) {
    for (const key of card.blocksFlags) {
      if (isFlagTruthy(state.flags, key)) return false
    }
  }
  return true
}

export function isCardEligible(state: GameState, card: Card): boolean {
  return matchesFlagRequirements(state, card) && matchesConditions(state, card)
}

export function getEligibleCards(state: GameState, catalog: Card[]): Card[] {
  return catalog.filter((c) => isCardEligible(state, c))
}

function isFallbackCard(card: Card): boolean {
  return Boolean(card.tags?.includes('fallback'))
}

export function pickNextCard(state: GameState, catalog: Card[], rng: Rng): string {
  const eligible = getEligibleCards(state, catalog)
  const nonFallback = eligible.filter((c) => !isFallbackCard(c))
  const withoutRepeat = state.lastCardId
    ? nonFallback.filter((c) => c.id !== state.lastCardId)
    : nonFallback
  const pool = withoutRepeat.length > 0 ? withoutRepeat : nonFallback
  const finalPool = pool.length > 0 ? pool : eligible.filter((c) => !isFallbackCard(c))
  const fb = eligible.filter(isFallbackCard)
  const usePool = finalPool.length > 0 ? finalPool : fb.length > 0 ? fb : eligible
  if (usePool.length === 0) {
    const any = catalog[0]
    return any ? any.id : 'missing_catalog'
  }
  const weights = usePool.map((c) => (c.weight !== undefined ? c.weight : 1))
  const idx = pickWeightedIndex(weights, rng)
  return usePool[idx]!.id
}
