import type {
  DepartmentId,
  InstituteProjectState,
  InstituteState,
  ProjectId,
  ProjectStatus,
} from '@/game/types'

const DEPARTMENT_IDS: DepartmentId[] = [
  'theory_lab',
  'special_contour',
  'supply_office',
  'curator_office',
  'anomaly_lab',
  'closed_archive',
]

const PROJECT_IDS: ProjectId[] = [
  'lunar_program',
  'psychotronic_chair',
  'anomaly_containment',
  'parallel_supply_chain',
  'classified_ai',
  'deep_archive',
]

const PROJECT_STATUSES: ProjectStatus[] = ['locked', 'available', 'active', 'completed', 'failed']

const DEFAULT_PROJECT_STATUSES: Record<ProjectId, ProjectStatus> = {
  lunar_program: 'available',
  psychotronic_chair: 'available',
  anomaly_containment: 'locked',
  parallel_supply_chain: 'locked',
  classified_ai: 'locked',
  deep_archive: 'locked',
}

function createInstituteProject(id: ProjectId): InstituteProjectState {
  return {
    id,
    status: DEFAULT_PROJECT_STATUSES[id],
    progress: 0,
    risk: 0,
  }
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function createDefaultInstituteState(): InstituteState {
  return {
    level: 1,
    reputation: 0,
    completedRuns: 0,
    unlockedDepartments: ['theory_lab', 'supply_office'],
    unlockedTechnologies: [],
    archive: [],
    projects: {
      lunar_program: createInstituteProject('lunar_program'),
      psychotronic_chair: createInstituteProject('psychotronic_chair'),
      anomaly_containment: createInstituteProject('anomaly_containment'),
      parallel_supply_chain: createInstituteProject('parallel_supply_chain'),
      classified_ai: createInstituteProject('classified_ai'),
      deep_archive: createInstituteProject('deep_archive'),
    },
  }
}

function isDepartmentId(value: string): value is DepartmentId {
  return DEPARTMENT_IDS.includes(value as DepartmentId)
}

export function isProjectId(value: string): value is ProjectId {
  return PROJECT_IDS.includes(value as ProjectId)
}

function isProjectStatus(value: string): value is ProjectStatus {
  return PROJECT_STATUSES.includes(value as ProjectStatus)
}

function dedupeList(values: readonly string[]): string[] {
  return [...new Set(values)]
}

export function mergeUnique<T extends string>(current: readonly T[], additions?: readonly T[]): T[] {
  if (!additions || additions.length === 0) return [...current]
  return [...new Set([...current, ...additions])]
}

export function normalizeInstituteState(partial: Partial<InstituteState> | undefined): InstituteState {
  const fallback = createDefaultInstituteState()
  if (!partial) return fallback

  const unlockedDepartments = dedupeList(partial.unlockedDepartments ?? fallback.unlockedDepartments).filter(
    isDepartmentId,
  )
  const unlockedTechnologies = dedupeList(partial.unlockedTechnologies ?? fallback.unlockedTechnologies)
  const archive = dedupeList(partial.archive ?? fallback.archive)

  const projects = PROJECT_IDS.reduce<Record<ProjectId, InstituteProjectState>>((acc, id) => {
    const base = fallback.projects[id]
    const incoming = partial.projects?.[id]
    acc[id] = {
      id,
      status: incoming?.status && isProjectStatus(incoming.status) ? incoming.status : base.status,
      progress: typeof incoming?.progress === 'number' ? clampPercent(incoming.progress) : base.progress,
      risk: typeof incoming?.risk === 'number' ? clampPercent(incoming.risk) : base.risk,
    }
    return acc
  }, { ...fallback.projects })

  return {
    level: typeof partial.level === 'number' ? partial.level : fallback.level,
    reputation: typeof partial.reputation === 'number' ? partial.reputation : fallback.reputation,
    completedRuns: typeof partial.completedRuns === 'number' ? partial.completedRuns : fallback.completedRuns,
    unlockedDepartments: unlockedDepartments.length > 0 ? unlockedDepartments : fallback.unlockedDepartments,
    unlockedTechnologies,
    archive,
    projects,
  }
}
