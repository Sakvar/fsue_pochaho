export function buildEndingShareBlurb(params: {
  title: string
  kind: 'failure' | 'victory'
  pageUrl: string
  scenarioLabel?: string
  secrecy?: number
  completedRuns?: number
  endingId?: string
}): string {
  const verdict = params.kind === 'victory' ? 'итог зафиксирован' : 'полномочия прекращены'
  const parts: string[] = [`ФГУП «ПОЧАХО» — «${params.title}» (${verdict}).`]
  if (params.scenarioLabel) parts.push(`Сценарий: ${params.scenarioLabel}.`)
  if (typeof params.secrecy === 'number') {
    const s = Math.round(Math.min(100, Math.max(0, params.secrecy)))
    parts.push(`Секретность: ${s}%.`)
  }
  if (typeof params.completedRuns === 'number') parts.push(`Завершённых назначений: ${params.completedRuns}.`)
  if (params.endingId) parts.push(`Учётный код: ${params.endingId}.`)
  parts.push(`Подпись: неразборчива. Играть: ${params.pageUrl}`)
  return parts.join(' ')
}
