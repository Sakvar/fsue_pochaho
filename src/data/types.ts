import type { ResourceKey } from '@/game/types'

export type FlagEffectValue = boolean | number | 'toggle'

export type CardEffects = {
  resources?: Partial<Record<ResourceKey, number>>
  flags?: Record<string, FlagEffectValue>
}

export type CardConditions = {
  minResource?: Partial<Record<ResourceKey, number>>
  maxResource?: Partial<Record<ResourceKey, number>>
  hasFlag?: string[]
  missingFlag?: string[]
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
