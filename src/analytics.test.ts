import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushAnalytics, track, trackEnding } from '@/analytics'

describe('analytics', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('is a no-op without endpoint', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    track({ type: 'card_choice', payload: { cardId: 'x', side: 'left' } })
    await flushAnalytics()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('POSTs batch when endpoint is set', async () => {
    vi.stubEnv('VITE_ANALYTICS_ENDPOINT', 'https://example.com/a')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    track({ type: 'game_start', payload: { source: 'app_mount' } })
    await flushAnalytics()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]!
    expect(init?.method).toBe('POST')
    const parsed = JSON.parse(String(init?.body))
    expect(parsed.events).toHaveLength(1)
    expect(parsed.events[0].type).toBe('game_start')
  })

  it('flushes immediately on ending', async () => {
    vi.stubEnv('VITE_ANALYTICS_ENDPOINT', 'https://example.com/a')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    trackEnding({ endingId: 'lose_funding' })
    expect(fetchMock).toHaveBeenCalled()
  })
})
