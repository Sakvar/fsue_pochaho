export interface ContractOfferTemplate {
  id: string;
  title: string;
  targetProducts: number;
  dueDays: number;
  advance: number;
  completionPay: number;
  grant: number;
  failPenalty: number;
  /** Minimum quality reputation needed before this customer sends an offer. */
  reputationRequired?: number;
  /** Extra pay for shipping without hidden defects. */
  flawlessBonus?: number;
  /** Extra pay when at least this many whole days remain. */
  earlyBonus?: number;
  earlyDaysRemaining?: number;
}

/** Fixed pool of contract templates; offers are drawn from here. */
export const CONTRACT_TEMPLATES: ContractOfferTemplate[] = [
  {
    id: 'corp-small',
    title: 'Корпуса для опытной партии',
    targetProducts: 3,
    dueDays: 25,
    advance: 180,
    completionPay: 220,
    grant: 60,
    failPenalty: 80,
  },
  {
    id: 'corp-plan',
    title: 'Квартальный план цеха №2',
    targetProducts: 5,
    dueDays: 35,
    advance: 260,
    completionPay: 340,
    grant: 100,
    failPenalty: 120,
  },
  {
    id: 'corp-urgent',
    title: 'Срочная поставка по разнарядке',
    targetProducts: 2,
    dueDays: 12,
    advance: 140,
    completionPay: 200,
    grant: 40,
    failPenalty: 100,
    flawlessBonus: 70,
    earlyBonus: 60,
    earlyDaysRemaining: 4,
  },
  {
    id: 'corp-ministry',
    title: 'Министерский пилотный заказ',
    targetProducts: 4,
    dueDays: 28,
    advance: 220,
    completionPay: 280,
    grant: 150,
    failPenalty: 140,
    reputationRequired: 62,
    flawlessBonus: 120,
  },
  {
    id: 'corp-repair-kit',
    title: 'Комплекты под ремонт парка',
    targetProducts: 6,
    dueDays: 40,
    advance: 300,
    completionPay: 420,
    grant: 80,
    failPenalty: 160,
    reputationRequired: 70,
    flawlessBonus: 160,
    earlyBonus: 100,
    earlyDaysRemaining: 8,
  },
  {
    id: 'corp-medical',
    title: 'Точная партия для медтехники',
    targetProducts: 4,
    dueDays: 22,
    advance: 260,
    completionPay: 390,
    grant: 120,
    failPenalty: 180,
    reputationRequired: 78,
    flawlessBonus: 240,
  },
];

export const SPARE_PART_UNIT_COST = 40;
export const CUTTER_UPGRADE_COST = 250;
export const STAFF_SOFT_CAP = 8;
export const STARTING_FUNDS = 650;
