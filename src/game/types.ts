export type ResourceKey =
  | 'personnelLoyalty'
  | 'kgbAttention'
  | 'scientificProgress'
  | 'facilityStability'
  | 'secrecy'
  | 'funding'

export type Resources = Record<ResourceKey, number>

export type GamePhase = 'playing' | 'ended'

export type ChoiceSide = 'left' | 'right'

export type GameState = {
  resources: Resources
  flags: Record<string, boolean | number>
  meta: { turn: number; year: number; runId: string }
  phase: GamePhase
  endingId: string | null
  currentCardId: string
  lastCardId: string | null
  history: { cardId: string; choice: ChoiceSide }[]
}
