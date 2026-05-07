import type { Card } from '@/data/types'
import type { CharacterProfile } from '@/data/characters'
import { CARD_LIST } from '@/data/cardContent'
import { CHARACTERS } from '@/data/characters'
import type { DossierCopy } from '@/game/dossierCopy'
import { DEFAULT_DOSSIER_COPY } from '@/game/dossierCopy'
import { START_YEAR } from '@/game/constants'

export type Scenario = {
  id: string
  label: string
  startYear: number
  cards: Card[]
  characters: CharacterProfile[]
  dossierCopy: DossierCopy
}

export const DEFAULT_SCENARIO_ID = 'pochaho_classic'

function scenarioCardsByTag(tag: string): Card[] {
  const fallback = CARD_LIST.filter((c) => c.tags?.includes('fallback'))
  const themed = CARD_LIST.filter((c) => c.tags?.includes(tag))
  const merged = [...themed, ...fallback]
  // Если тема пустая (опечатка/нет карточек), хотя бы оставим fallback.
  return merged.length > 0 ? merged : fallback
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'pochaho_classic',
    label: 'Классика (1983)',
    startYear: START_YEAR,
    cards: CARD_LIST,
    characters: CHARACTERS,
    dossierCopy: DEFAULT_DOSSIER_COPY,
  },
  {
    id: 'pochaho_late_start',
    label: 'Поздний запуск (1988)',
    startYear: 1988,
    cards: CARD_LIST,
    characters: CHARACTERS,
    dossierCopy: DEFAULT_DOSSIER_COPY,
  },
  {
    id: 'pochaho_rosnano_2011',
    label: 'Роснано (2011–2013)',
    startYear: 2011,
    cards: scenarioCardsByTag('rosnano_2011_2013'),
    characters: CHARACTERS,
    dossierCopy: DEFAULT_DOSSIER_COPY,
  },
]

export function getScenario(id: string | undefined | null): Scenario {
  if (!id) return SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO_ID) ?? SCENARIOS[0]!
  return SCENARIOS.find((s) => s.id === id) ?? (SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO_ID) ?? SCENARIOS[0]!)
}

