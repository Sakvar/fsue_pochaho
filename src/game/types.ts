export type ResourceKey =
  | 'personnelLoyalty'
  | 'kgbAttention'
  | 'scientificProgress'
  | 'facilityStability'
  | 'secrecy'
  | 'funding'

export type Resources = Record<ResourceKey, number>

export type GamePhase = 'playing' | 'ended'

export type ChoiceSide = 'left' | 'right'

export type DepartmentId =
  | 'theory_lab'
  | 'special_contour'
  | 'supply_office'
  | 'curator_office'
  | 'anomaly_lab'
  | 'closed_archive'

export type ProjectId =
  | 'lunar_program'
  | 'psychotronic_chair'
  | 'anomaly_containment'
  | 'parallel_supply_chain'
  | 'classified_ai'
  | 'deep_archive'

export type ProjectStatus = 'locked' | 'available' | 'active' | 'completed' | 'failed'

export type InstituteProjectState = {
  id: ProjectId
  status: ProjectStatus
  progress: number
  risk: number
}

export type InstituteState = {
  level: number
  reputation: number
  completedRuns: number
  unlockedDepartments: DepartmentId[]
  unlockedTechnologies: string[]
  archive: string[]
  projects: Record<ProjectId, InstituteProjectState>
}

export type EndingRewardsSummary = {
  reputationDelta: number
  archiveEntries: string[]
  unlockedDepartments: DepartmentId[]
  unlockedProjects: ProjectId[]
}

export type GameState = {
  resources: Resources
  flags: Record<string, boolean | number>
  institute: InstituteState
  meta: { turn: number; year: number; runId: string; scenarioId: string; endingRewardsApplied?: boolean }
  phase: GamePhase
  endingId: string | null
  endingRewards: EndingRewardsSummary | null
  currentCardId: string
  lastCardId: string | null
  history: { cardId: string; choice: ChoiceSide }[]
}
