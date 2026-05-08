import type { Card } from '@/data/types'
import type { CharacterProfile } from '@/data/characters'
import { CARD_LIST } from '@/data/cardContent'
import { CHARACTERS } from '@/data/characters'
import type { DossierCopy } from '@/game/dossierCopy'
import { DEFAULT_DOSSIER_COPY } from '@/game/dossierCopy'
import { START_YEAR } from '@/game/constants'
import type { InstituteState } from '@/game/types'

export type Scenario = {
  id: string
  label: string
  startYear: number
  cards: Card[]
  characters: CharacterProfile[]
  dossierCopy: DossierCopy
}

export const DEFAULT_SCENARIO_ID = 'pochaho_classic'
export const ROSNANO_SCENARIO_ARCHIVE_UNLOCK = 'ending:win_breakthrough'
const SCENARIO_THEME_TAGS = ['pochaho_2011_2013'] as const

function isTaggedForOtherScenario(card: Card, excludedTag: string): boolean {
  if (!card.tags || card.tags.length === 0) return false
  return SCENARIO_THEME_TAGS.some((tag) => tag !== excludedTag && card.tags?.includes(tag))
}

function baseScenarioCards(): Card[] {
  return CARD_LIST.filter((card) => !isTaggedForOtherScenario(card, ''))
}

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
    cards: baseScenarioCards(),
    characters: CHARACTERS,
    dossierCopy: DEFAULT_DOSSIER_COPY,
  },
  {
    id: 'pochaho_late_start',
    label: 'Поздний запуск (1988)',
    startYear: 1988,
    cards: baseScenarioCards(),
    characters: CHARACTERS,
    dossierCopy: DEFAULT_DOSSIER_COPY,
  },
  {
    id: 'pochaho_rosnano_2011',
    label: 'Почахо (2011)',
    startYear: 2011,
    cards: scenarioCardsByTag('pochaho_2011_2013'),
    characters: CHARACTERS,
    dossierCopy: DEFAULT_DOSSIER_COPY,
  },
]

export function getScenario(id: string | undefined | null): Scenario {
  if (!id) return SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO_ID) ?? SCENARIOS[0]!
  return SCENARIOS.find((s) => s.id === id) ?? (SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO_ID) ?? SCENARIOS[0]!)
}

export function isScenarioUnlocked(scenarioId: string, institute: InstituteState): boolean {
  switch (scenarioId) {
    case 'pochaho_classic':
      return true
    case 'pochaho_late_start':
      return institute.completedRuns >= 1
    case 'pochaho_rosnano_2011':
      return institute.completedRuns >= 2 || institute.archive.includes(ROSNANO_SCENARIO_ARCHIVE_UNLOCK)
    default:
      return true
  }
}

export function canSelectScenario(scenarioId: string, institute: InstituteState, currentScenarioId: string): boolean {
  return scenarioId === currentScenarioId || isScenarioUnlocked(scenarioId, institute)
}

export function scenarioLockHint(scenarioId: string): string | null {
  switch (scenarioId) {
    case 'pochaho_late_start':
      return 'Открывается после 1 завершённого назначения.'
    case 'pochaho_rosnano_2011':
      return 'Открывается после 2 завершённых назначений или архивной записи «ending:win_breakthrough».'
    default:
      return null
  }
}

