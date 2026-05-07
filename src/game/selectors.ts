import type { Card } from '@/data/types'
import type { ResourceKey, Resources } from '@/game/types'

export type MeterView = {
  key: ResourceKey
  label: string
  shortLabel: string
  description: string
  value: number
}

const METER_LABELS: Record<ResourceKey, { label: string; shortLabel: string; description: string }> = {
  personnelLoyalty: {
    label: 'Лояльность персонала',
    shortLabel: 'Лояльность',
    description:
      'Готовность сотрудников выполнять директивы без саботажа и доносов. Падает от переработок, репрессий и невыплат.',
  },
  kgbAttention: {
    label: 'Внимание органов',
    shortLabel: 'Кураторство',
    description:
      'Интерес органов госбезопасности к объекту. Высокий уровень — частые проверки, выемки документов и риск кадровых чисток.',
  },
  scientificProgress: {
    label: 'Научный прогресс',
    shortLabel: 'Наука',
    description:
      'Темп НИОКР по основной программе. Без прогресса срываются плановые показатели и сокращается финансирование сверху.',
  },
  facilityStability: {
    label: 'Стабильность объекта',
    shortLabel: 'Стабильность',
    description:
      'Состояние оборудования, коммуникаций и инфраструктуры. Низкая — аварии, простои и угроза катастрофы.',
  },
  secrecy: {
    label: 'Секретность',
    shortLabel: 'Секретность',
    description:
      'Эффективность режима секретности. Низкая — утечки сведений, слухи в городе и интерес иностранных служб.',
  },
  funding: {
    label: 'Финансирование',
    shortLabel: 'Бюджет',
    description:
      'Состояние сметы по статьям расходов. Минус — задержки зарплат, сокращения и отказы поставщиков работать в кредит.',
  },
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
