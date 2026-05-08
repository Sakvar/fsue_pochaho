import { mergeUnique } from '@/game/institute'
import { getEndingCopy } from '@/game/endings'
import type {
  DepartmentId,
  EndingRewardsSummary,
  GameState,
  InstituteProjectState,
  ProjectId,
  ProjectStatus,
} from '@/game/types'

type EndingRewardRule = {
  reputationDelta: number
  unlockDepartments?: DepartmentId[]
  unlockProjects?: ProjectId[]
}

const ENDING_REWARD_RULES: Partial<Record<string, EndingRewardRule>> = {
  lose_loyalty: { reputationDelta: -1 },
  lose_stability: { reputationDelta: -1, unlockDepartments: ['anomaly_lab'] },
  lose_secrecy: { reputationDelta: -1 },
  lose_funding: { reputationDelta: 0, unlockProjects: ['parallel_supply_chain'] },
  lose_kgb: { reputationDelta: 0, unlockDepartments: ['special_contour'] },
  win_breakthrough: {
    reputationDelta: 3,
    unlockDepartments: ['special_contour', 'anomaly_lab'],
    unlockProjects: ['anomaly_containment', 'classified_ai'],
  },
  win_promotion: {
    reputationDelta: 2,
    unlockDepartments: ['curator_office'],
    unlockProjects: ['deep_archive'],
  },
  win_stagnation: {
    reputationDelta: 1,
    unlockDepartments: ['closed_archive'],
    unlockProjects: ['lunar_program', 'psychotronic_chair'],
  },
}

function calculateInstituteLevel(completedRuns: number, reputation: number, currentLevel: number): number {
  const runTier = Math.floor(completedRuns / 2)
  const reputationTier = Math.floor(Math.max(0, reputation) / 6)
  return Math.max(currentLevel, 1 + runTier + reputationTier)
}

function unlockProjectStatuses(
  projects: Record<ProjectId, InstituteProjectState>,
  projectIds: readonly ProjectId[],
): Record<ProjectId, InstituteProjectState> {
  if (projectIds.length === 0) return projects
  let next = projects
  for (const id of projectIds) {
    const current = next[id]
    if (!current || current.status !== 'locked') continue
    if (next === projects) next = { ...projects }
    next[id] = { ...current, status: 'available' as ProjectStatus }
  }
  return next
}

export function applyEndingRewards(state: GameState, endingId: string): GameState {
  if (state.meta.endingRewardsApplied) return state

  const ending = getEndingCopy(endingId)
  const fallbackDelta = ending?.kind === 'failure' ? -1 : 1
  const rewardRule = ENDING_REWARD_RULES[endingId]
  const reputationDelta = rewardRule?.reputationDelta ?? fallbackDelta
  const archiveEntry = `ending:${endingId}`

  const before = state.institute
  const unlockedDepartments = mergeUnique(before.unlockedDepartments, rewardRule?.unlockDepartments)
  const archive = mergeUnique(before.archive, [archiveEntry])
  const unlockedProjects = rewardRule?.unlockProjects ?? []
  const projects = unlockProjectStatuses(before.projects, unlockedProjects)

  const completedRuns = before.completedRuns + 1
  const reputation = before.reputation + reputationDelta
  const level = calculateInstituteLevel(completedRuns, reputation, before.level)

  const rewards: EndingRewardsSummary = {
    reputationDelta,
    archiveEntries: before.archive.includes(archiveEntry) ? [] : [archiveEntry],
    unlockedDepartments: unlockedDepartments.filter((id) => !before.unlockedDepartments.includes(id)),
    unlockedProjects: unlockedProjects.filter((id) => before.projects[id].status === 'locked'),
  }

  return {
    ...state,
    institute: {
      ...before,
      level,
      reputation,
      completedRuns,
      unlockedDepartments,
      archive,
      projects,
    },
    meta: {
      ...state.meta,
      endingRewardsApplied: true,
    },
    endingRewards: rewards,
  }
}
