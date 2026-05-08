import { isProjectId } from '@/game/institute'
import type { InstituteProjectState, ProjectId, ProjectStatus } from '@/game/types'

export type ProjectEffectPatch = {
  progress?: number
  risk?: number
  status?: ProjectStatus
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function applyProjectEffects(
  projects: Record<ProjectId, InstituteProjectState>,
  effects?: Partial<Record<ProjectId, ProjectEffectPatch>>,
): Record<ProjectId, InstituteProjectState> {
  if (!effects) return projects
  let next = projects

  for (const [rawId, patch] of Object.entries(effects)) {
    if (!patch || !isProjectId(rawId)) continue
    const id = rawId as ProjectId
    const current = next[id]
    const explicitStatus = patch.status
    const progress = clampPercent(current.progress + (patch.progress ?? 0))
    const risk = clampPercent(current.risk + (patch.risk ?? 0))
    let status = explicitStatus ?? current.status

    if (progress >= 100 && explicitStatus !== 'failed' && status !== 'failed') {
      status = 'completed'
    }

    if (next === projects) next = { ...projects }
    next[id] = {
      ...current,
      progress,
      risk,
      status,
    }
  }

  return next
}
