import { isFlagTruthy } from '@/game/cardEngine'
import type { GameState } from '@/game/types'

type RumorRule = {
  id: string
  anyOf?: string[]
  allOf?: string[]
  text: string
}

const RUMORS: RumorRule[] = [
  {
    id: 'night_tests',
    anyOf: ['koplyov_night_ok', 'unauthorized_night_work'],
    text: 'В коридорах шепчутся о ночных запусках без полного протокола.',
  },
  {
    id: 'serov_watch',
    anyOf: ['serov_watch', 'kgb_extra_scrutiny'],
    text: 'Сотрудники замечают «гостей» с папками, которые не подписываются в журнале.',
  },
  {
    id: 'black_market',
    anyOf: ['black_market_link', 'shadow_supplier'],
    text: 'На складе появляется оборудование без заводских ярлыков.',
  },
  {
    id: 'radiation_whisper',
    anyOf: ['radiation_incident_soft', 'radiation_coverup'],
    text: 'Медпункт выдаёт больше дозиметров, чем обычно для «планового месяца».',
  },
  {
    id: 'fake_reports',
    anyOf: ['reports_falsified', 'ministry_misled'],
    text: 'Бухгалтерия находит в отчётах красивые цифры, которые плохо стыкуются с расходом.',
  },
  {
    id: 'anomaly_room',
    anyOf: ['anomaly_observed', 'containment_talks'],
    text: 'В лабораторных журналах появляется слово «аномалия» чаще, чем положено.',
  },
  {
    id: 'ideology_campaign',
    anyOf: ['ideology_pressure', 'campaign_active'],
    text: 'Партийные плакаты закрывают схемы вентиляции — буквально и фигурально.',
  },
  {
    id: 'bragin_pride',
    anyOf: ['bragin_insulted', 'bragin_praised'],
    text: 'Академик Брагин ведёт себя так, будто от его подписи зависит воздух.',
  },
  {
    id: 'lesha_disillusion',
    anyOf: ['lesha_trouble', 'lesha_reprimand'],
    text: 'Молодые специалисты задают вопросы, на которые нет цитаты из устава.',
  },
  {
    id: 'budget_gap',
    anyOf: ['budget_shortfall', 'emergency_loan'],
    text: 'Кассовые дыры закрывают «временными мерами», которые длиннее квартала.',
  },
]

const CRISIS_RULES: RumorRule[] = [
  {
    id: 'crisis_radiation',
    anyOf: ['radiation_incident_soft', 'radiation_coverup'],
    text: 'Радиационный контур: повышенное внимание к замерам и журналам.',
  },
  {
    id: 'crisis_kgb',
    allOf: ['kgb_extra_scrutiny'],
    text: 'Кураторство усилено: проверки без предупреждения.',
  },
  {
    id: 'crisis_secrecy',
    anyOf: ['leak_risk', 'press_near_miss'],
    text: 'Риск утечки: внешние вопросы задают слишком точно.',
  },
  {
    id: 'crisis_ethics',
    anyOf: ['unethical_approved', 'human_subject_risk'],
    text: 'Этический разрыв: протоколы требуют «творческого толкования».',
  },
  {
    id: 'crisis_supply',
    allOf: ['supply_chain_break'],
    text: 'Снабжение: критические позиции закрываются «из запасов».',
  },
]

function ruleMatches(flags: Record<string, boolean | number>, rule: RumorRule): boolean {
  if (rule.allOf && !rule.allOf.every((k) => isFlagTruthy(flags, k))) return false
  if (rule.anyOf && !rule.anyOf.some((k) => isFlagTruthy(flags, k))) return false
  return true
}

function reputationLine(state: Pick<GameState, 'resources'>): string {
  const { personnelLoyalty, kgbAttention, scientificProgress, facilityStability, secrecy, funding } =
    state.resources
  if (scientificProgress >= 75 && secrecy >= 60 && kgbAttention <= 55) {
    return 'В министерских коридорах вас называют «перспективным узлом».'
  }
  if (kgbAttention >= 75 || secrecy <= 35) {
    return 'Репутация объекта — в зоне повышенной внимательности.'
  }
  if (personnelLoyalty <= 35 || facilityStability <= 35) {
    return 'Коллектив и инфраструктура выглядят натянутыми до предела.'
  }
  if (funding <= 35) {
    return 'Финансовая дисциплина описывается словом «выжимание».'
  }
  return 'Объект выглядит устойчивым — настолько, насколько это вообще возможно.'
}

export type DossierViewModel = {
  year: number
  turn: number
  rumors: string[]
  crises: string[]
  reputation: string
}

export function buildDossierView(state: Pick<GameState, 'resources' | 'flags' | 'meta'>): DossierViewModel {
  const rumors = RUMORS.filter((r) => ruleMatches(state.flags, r)).map((r) => r.text)
  const crises = CRISIS_RULES.filter((r) => ruleMatches(state.flags, r)).map((r) => r.text)
  return {
    year: state.meta.year,
    turn: state.meta.turn,
    rumors: rumors.slice(0, 6),
    crises: crises.slice(0, 4),
    reputation: reputationLine(state),
  }
}
