import type { Card } from '@/data/types'
import type { ResourceKey, Resources } from '@/game/types'

export type MeterView = {
  key: ResourceKey
  label: string
  shortLabel: string
  value: number
}

const METER_LABELS: Record<ResourceKey, { label: string; shortLabel: string }> = {
  personnelLoyalty: { label: 'Лояльность персонала', shortLabel: 'Лояльность' },
  kgbAttention: { label: 'Внимание органов', shortLabel: 'Кураторство' },
  scientificProgress: { label: 'Научный прогресс', shortLabel: 'Наука' },
  facilityStability: { label: 'Стабильность объекта', shortLabel: 'Стабильность' },
  secrecy: { label: 'Секретность', shortLabel: 'Секретность' },
  funding: { label: 'Финансирование', shortLabel: 'Бюджет' },
}

export function selectMeters(resources: Resources): MeterView[] {
  return (Object.keys(METER_LABELS) as ResourceKey[]).map((key) => ({
    key,
    ...METER_LABELS[key],
    value: resources[key],
  }))
}

export function selectCurrentCard(currentCardId: string, cardsById: Record<string, Card>): Card | null {
  return cardsById[currentCardId] ?? null
}
