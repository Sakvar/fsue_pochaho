import { describe, expect, it } from 'vitest'
import { CARD_CATALOG_SCENE_COUNT, CARD_LIST } from '@/data/cardContent'

describe('card catalog', () => {
  it('exports scene count matching CARD_LIST length', () => {
    expect(CARD_CATALOG_SCENE_COUNT).toBe(CARD_LIST.length)
    expect(CARD_CATALOG_SCENE_COUNT).toBe(75)
  })
})
