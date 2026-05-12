import { describe, expect, it } from 'vitest'
import { buildEndingShareBlurb } from '@/game/endingShare'

describe('ending share blurb', () => {
  it('includes title and verdict', () => {
    const text = buildEndingShareBlurb({
      title: 'Тест',
      kind: 'victory',
      pageUrl: 'https://example.com/x',
    })
    expect(text).toContain('Тест')
    expect(text).toContain('итог зафиксирован')
    expect(text).toContain('https://example.com/x')
  })
})
