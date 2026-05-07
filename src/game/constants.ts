import type { Resources } from '@/game/types'

export const START_YEAR = 1983

export const TURNS_PER_YEAR = 8

export const HISTORY_LIMIT = 24

export const INITIAL_RESOURCES: Resources = {
  personnelLoyalty: 50,
  kgbAttention: 50,
  scientificProgress: 50,
  facilityStability: 50,
  secrecy: 50,
  funding: 50,
}

export const RESOURCE_MIN = 0
export const RESOURCE_MAX = 100

export const STAMP_MESSAGES = [
  'УТВЕРЖДЕНО',
  'СЕКРЕТНО',
  'ОТКЛОНЕНО',
  'ДЛЯ СЛУЖЕБНОГО ПОЛЬЗОВАНИЯ',
  'ДОВЕДЕНО ДО МИНИСТЕРСТВА',
  'ЗАРЕГИСТРИРОВАНО',
  'ТРЕБУЕТСЯ ПОДПИСЬ',
] as const
