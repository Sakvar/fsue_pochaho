import { describe, expect, it } from 'vitest'
import { endingIdFromArchiveEntry, hasEndingInArchive } from '@/game/endingDiscovery'

describe('endingDiscovery', () => {
  it('parses ending ids from archive entries', () => {
    expect(endingIdFromArchiveEntry('ending:lose_funding')).toBe('lose_funding')
    expect(endingIdFromArchiveEntry('archive:foo')).toBeNull()
  })

  it('detects endings in archive', () => {
    expect(hasEndingInArchive(['ending:win_breakthrough'], 'win_breakthrough')).toBe(true)
    expect(hasEndingInArchive([], 'win_breakthrough')).toBe(false)
  })
})
