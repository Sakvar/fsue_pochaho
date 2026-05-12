export type GameStartPayload = {
  source: 'app_mount' | 'new_run'
  scenarioId?: string
}

export type CardChoicePayload = {
  cardId: string
  side: 'left' | 'right'
}

export type ScenarioChangePayload = {
  fromScenarioId: string
  toScenarioId: string
}

export type EndingPayload = {
  endingId: string
}

export type SupportClickPayload = {
  target: 'footer' | 'about' | 'ending'
  href: string
}

export type AnalyticsEvent =
  | { type: 'game_start'; payload: GameStartPayload }
  | { type: 'card_choice'; payload: CardChoicePayload }
  | { type: 'scenario_change'; payload: ScenarioChangePayload }
  | { type: 'ending'; payload: EndingPayload }
  | { type: 'support_click'; payload: SupportClickPayload }

const queue: AnalyticsEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function analyticsEndpoint(): string | undefined {
  const raw = import.meta.env.VITE_ANALYTICS_ENDPOINT
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined
}

function scheduleFlush(): void {
  if (!analyticsEndpoint()) return
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushAnalytics()
  }, 2000)
}

export async function flushAnalytics(): Promise<void> {
  const endpoint = analyticsEndpoint()
  if (!endpoint || queue.length === 0) return
  const batch = queue.splice(0, queue.length)
  const body = JSON.stringify({
    events: batch,
    sentAt: Date.now(),
    origin: typeof window !== 'undefined' ? window.location.origin : undefined,
  })
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      mode: 'cors',
      keepalive: true,
    })
  } catch {
    queue.unshift(...batch)
  }
}

export function track(event: AnalyticsEvent): void {
  if (!analyticsEndpoint()) return
  queue.push(event)
  if (event.type === 'ending') {
    void flushAnalytics()
    return
  }
  scheduleFlush()
}

export function trackGameStart(source: GameStartPayload['source'], scenarioId?: string): void {
  track({ type: 'game_start', payload: scenarioId ? { source, scenarioId } : { source } })
}

export function trackCardChoice(payload: CardChoicePayload): void {
  track({ type: 'card_choice', payload })
}

export function trackScenarioChange(payload: ScenarioChangePayload): void {
  track({ type: 'scenario_change', payload })
}

export function trackEnding(payload: EndingPayload): void {
  track({ type: 'ending', payload })
}

export function trackSupportClick(payload: SupportClickPayload): void {
  track({ type: 'support_click', payload })
}
