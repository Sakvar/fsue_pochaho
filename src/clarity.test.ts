import { afterEach, describe, expect, it, vi } from 'vitest'
import { initClarity } from '@/clarity'

describe('initClarity', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    document.querySelectorAll('script[src*="clarity.ms"]').forEach((n) => n.remove())
    Reflect.deleteProperty(window, 'clarity')
  })

  it('does nothing without project id', () => {
    initClarity()
    expect(document.querySelector('script[src*="clarity.ms"]')).toBeNull()
  })

  it('injects tag script when project id is set', () => {
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'abc123')
    initClarity()
    const el = document.querySelector('script[src="https://www.clarity.ms/tag/abc123"]')
    expect(el).not.toBeNull()
    expect((el as HTMLScriptElement).async).toBe(true)
  })
})
