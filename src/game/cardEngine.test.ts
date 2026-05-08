import { describe, expect, it } from 'vitest'
import type { Card } from '@/data/types'
import { createEmptyState } from '@/game/logic'
import { getEligibleCards, isCardEligible, pickNextCard } from '@/game/cardEngine'
import { DEFAULT_SCENARIO_ID } from '@/game/scenarios'

const catalog: Card[] = [
  {
    id: 'always',
    title: 'A',
    speaker: 'S',
    body: 'B',
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
  {
    id: 'needs_flag',
    title: 'N',
    speaker: 'S',
    body: 'B',
    requiresFlags: ['gate'],
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
  {
    id: 'blocked_when_flag',
    title: 'X',
    speaker: 'S',
    body: 'B',
    blocksFlags: ['gate'],
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
  {
    id: 'conditional',
    title: 'C',
    speaker: 'S',
    body: 'B',
    conditions: { minResource: { funding: 60 } },
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
  {
    id: 'fallback',
    title: 'F',
    speaker: 'S',
    body: 'B',
    tags: ['fallback'],
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
  {
    id: 'needs_department',
    title: 'D',
    speaker: 'S',
    body: 'B',
    conditions: { requiresDepartment: ['anomaly_lab'] },
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
  {
    id: 'needs_project_status',
    title: 'P',
    speaker: 'S',
    body: 'B',
    conditions: { requiresProjectStatus: { lunar_program: 'active' } },
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
  {
    id: 'needs_archive_entry',
    title: 'AR',
    speaker: 'S',
    body: 'B',
    conditions: { hasArchiveEntry: ['archive:test_entry'] },
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
  {
    id: 'blocked_by_archive_entry',
    title: 'BAR',
    speaker: 'S',
    body: 'B',
    conditions: { missingArchiveEntry: ['archive:test_entry'] },
    left: { label: 'L', previewHint: 'x', effects: {} },
    right: { label: 'R', previewHint: 'y', effects: {} },
  },
]

describe('cardEngine', () => {
  it('filters requiresFlags and blocksFlags', () => {
    const base = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    const open = getEligibleCards(base, catalog).map((c) => c.id)
    expect(open).toContain('always')
    expect(open).not.toContain('needs_flag')
    base.flags.gate = true
    const gated = getEligibleCards(base, catalog).map((c) => c.id)
    expect(gated).toContain('needs_flag')
    expect(gated).not.toContain('blocked_when_flag')
  })

  it('filters resource conditions', () => {
    const base = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    expect(isCardEligible(base, catalog.find((c) => c.id === 'conditional')!)).toBe(false)
    base.resources.funding = 60
    expect(isCardEligible(base, catalog.find((c) => c.id === 'conditional')!)).toBe(true)
  })

  it('filters institute departments and project statuses', () => {
    const base = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    expect(isCardEligible(base, catalog.find((c) => c.id === 'needs_department')!)).toBe(false)
    expect(isCardEligible(base, catalog.find((c) => c.id === 'needs_project_status')!)).toBe(false)

    base.institute.unlockedDepartments.push('anomaly_lab')
    base.institute.projects.lunar_program.status = 'active'

    expect(isCardEligible(base, catalog.find((c) => c.id === 'needs_department')!)).toBe(true)
    expect(isCardEligible(base, catalog.find((c) => c.id === 'needs_project_status')!)).toBe(true)
  })

  it('filters archive conditions similar to flags', () => {
    const base = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    expect(isCardEligible(base, catalog.find((c) => c.id === 'needs_archive_entry')!)).toBe(false)
    expect(isCardEligible(base, catalog.find((c) => c.id === 'blocked_by_archive_entry')!)).toBe(true)

    base.institute.archive.push('archive:test_entry')

    expect(isCardEligible(base, catalog.find((c) => c.id === 'needs_archive_entry')!)).toBe(true)
    expect(isCardEligible(base, catalog.find((c) => c.id === 'blocked_by_archive_entry')!)).toBe(false)
  })

  it('pickNextCard returns a valid id', () => {
    const base = createEmptyState('t', DEFAULT_SCENARIO_ID, 1983)
    const id = pickNextCard(base, catalog, () => 0.5)
    expect(catalog.some((c) => c.id === id)).toBe(true)
  })
})
