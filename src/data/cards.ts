import type { Card } from '@/data/types'
import { CARD_LIST } from '@/data/cardContent'

export const CARDS: Card[] = CARD_LIST

export const CARDS_BY_ID: Record<string, Card> = Object.fromEntries(
  CARD_LIST.map((card) => [card.id, card]),
)
