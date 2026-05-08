import type { DepartmentId, ProjectId, ProjectStatus, ResourceKey } from '@/game/types'

export type FlagEffectValue = boolean | number | 'toggle'

export type CardEffects = {
  resources?: Partial<Record<ResourceKey, number>>
  flags?: Record<string, FlagEffectValue>
  institute?: {
    reputation?: number
    unlockDepartments?: DepartmentId[]
    unlockTechnologies?: string[]
    archiveEntries?: string[]
  }
  projects?: Partial<
    Record<
      ProjectId,
      {
        progress?: number
        risk?: number
        status?: ProjectStatus
      }
    >
  >
}

export type CardConditions = {
  minResource?: Partial<Record<ResourceKey, number>>
  maxResource?: Partial<Record<ResourceKey, number>>
  hasFlag?: string[]
  missingFlag?: string[]
  requiresDepartment?: DepartmentId[]
  requiresProjectStatus?: Partial<Record<ProjectId, ProjectStatus>>
  hasArchiveEntry?: string[]
  missingArchiveEntry?: string[]
  turnGte?: number
}

export type CardOption = {
  label: string
  previewHint: string
  effects: CardEffects
  stamp?: string
}

export type Card = {
  id: string
  title: string
  speaker: string
  body: string
  left: CardOption
  right: CardOption
  conditions?: CardConditions
  requiresFlags?: string[]
  blocksFlags?: string[]
  followUp?: { left?: string; right?: string }
  tags?: string[]
  weight?: number
}
