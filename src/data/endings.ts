import type { ResourceKey } from '@/game/types'

export type EndingKind = 'failure' | 'victory'

export type EndingMatch =
  | { op: 'resourceLte'; key: ResourceKey; value: number }
  | { op: 'resourceGte'; key: ResourceKey; value: number }
  | { op: 'turnGte'; value: number }
  | { op: 'flagTrue'; key: string }
  | { op: 'all'; items: EndingMatch[] }

export type EndingDefinition = {
  id: string
  title: string
  body: string
  kind: EndingKind
  priority: number
  match: EndingMatch
}

export const ENDING_DEFINITIONS: EndingDefinition[] = [
  {
    id: 'lose_loyalty',
    title: 'Потеря доверия коллектива',
    body: 'Сотрудники перестали выполнять распоряжения. Объект переводят под внешнее управление. Ваша подпись больше ничего не значит.',
    kind: 'failure',
    priority: 10,
    match: { op: 'resourceLte', key: 'personnelLoyalty', value: 0 },
  },
  {
    id: 'lose_stability',
    title: 'Аварийное состояние объекта',
    body: 'Инфраструктура не выдерживает режима секретности и ремонтов одновременно. Комиссия фиксирует «системный сбой». Дальше — не ваша зона ответственности.',
    kind: 'failure',
    priority: 11,
    match: { op: 'resourceLte', key: 'facilityStability', value: 0 },
  },
  {
    id: 'lose_secrecy',
    title: 'Утечка сведений',
    body: 'Коридоры говорят слишком громко. Печать «совершенно секретно» превращается в заголовок газеты. Вас отзывают для «уточнений».',
    kind: 'failure',
    priority: 12,
    match: { op: 'resourceLte', key: 'secrecy', value: 0 },
  },
  {
    id: 'lose_funding',
    title: 'Касса пуста',
    body: 'Финансирование прекращено без объяснений. Остались только архивные описи и списанное оборудование. Институт закрывают по экономическому параграфу.',
    kind: 'failure',
    priority: 13,
    match: { op: 'resourceLte', key: 'funding', value: 0 },
  },
  {
    id: 'lose_kgb',
    title: 'Повышенное внимание',
    body: 'Кураторство перестало быть формальностью. Ваш кабинет измеряют метром. Дальнейшие решения принимают без вас — быстро и окончательно.',
    kind: 'failure',
    priority: 14,
    match: { op: 'resourceGte', key: 'kgbAttention', value: 100 },
  },
  {
    id: 'win_breakthrough',
    title: 'Научный прорыв',
    body: 'Цифры сходятся. Эффект воспроизводим. Министерство шепчет слово «перспектива», а вы получаете папку с грифом, который красивее денег.',
    kind: 'victory',
    priority: 100,
    match: { op: 'resourceGte', key: 'scientificProgress', value: 100 },
  },
  {
    id: 'win_promotion',
    title: 'Абсурдное повышение',
    body: 'Вас повышают за «гибкость подхода». Новая должность не имеет описания, зато имеет отдельный сейф. Вы выиграли систему, не меняя её.',
    kind: 'victory',
    priority: 110,
    match: { op: 'flagTrue', key: 'absurd_promotion' },
  },
  {
    id: 'win_stagnation',
    title: 'Выживание без триумфа',
    body: 'Годы проходят, сирены не выходят за пределы учреждения. Наука ползёт вперёд настолько медленно, что это считается стабильностью. Вам ставят подпись — «удовлетворительно».',
    kind: 'victory',
    priority: 120,
    match: {
      op: 'all',
      items: [
        { op: 'turnGte', value: 48 },
        { op: 'resourceLte', key: 'scientificProgress', value: 89 },
        { op: 'resourceGte', key: 'scientificProgress', value: 28 },
        { op: 'resourceGte', key: 'personnelLoyalty', value: 20 },
        { op: 'resourceLte', key: 'kgbAttention', value: 96 },
      ],
    },
  },
]
