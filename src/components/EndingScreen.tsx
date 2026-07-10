import { useCallback, useMemo, useState } from 'react'
import { buildEndingShareBlurb } from '@/game/endingShare'
import { getEndingCopy } from '@/game/endings'
import { DEPARTMENT_LABELS, PROJECT_LABELS } from '@/game/instituteCatalog'
import { copyToClipboard, getShareablePageUrl, openTelegramShareUrl } from '@/integrations/telegram'
import type { EndingRewardsSummary } from '@/game/types'

type ShareMeta = {
  scenarioLabel: string
  secrecy: number
  completedRuns: number
}

type Props = {
  endingId: string
  rewards: EndingRewardsSummary | null
  onRestart: () => void
  shareMeta?: ShareMeta
}

export function EndingScreen({ endingId, rewards, onRestart, shareMeta }: Props) {
  const ending = getEndingCopy(endingId)
  const title = ending?.title ?? 'Исход'
  const body = ending?.body ?? 'Состояние не классифицировано.'
  const kind = ending?.kind ?? 'failure'
  const [copyHint, setCopyHint] = useState<string | null>(null)

  const pageUrl = useMemo(() => getShareablePageUrl(), [])
  const shareBlurb = useMemo(
    () =>
      buildEndingShareBlurb({
        title,
        kind,
        pageUrl: pageUrl || 'https://example.com/pochaho-demo',
        scenarioLabel: shareMeta?.scenarioLabel,
        secrecy: shareMeta?.secrecy,
        completedRuns: shareMeta?.completedRuns,
        endingId,
      }),
    [title, kind, pageUrl, shareMeta?.scenarioLabel, shareMeta?.secrecy, shareMeta?.completedRuns, endingId],
  )

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(shareBlurb)
    setCopyHint(ok ? 'Текст скопирован в буфер.' : 'Не удалось скопировать — выделите вручную.')
    window.setTimeout(() => setCopyHint(null), 3200)
  }, [shareBlurb])

  const handleWebShare = useCallback(async () => {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      setCopyHint('Web Share недоступен в этом браузере.')
      window.setTimeout(() => setCopyHint(null), 3200)
      return
    }
    try {
      await navigator.share({ text: shareBlurb, url: pageUrl || undefined })
    } catch {
      /* user cancelled */
    }
  }, [pageUrl, shareBlurb])

  const handleTelegramShare = useCallback(() => {
    openTelegramShareUrl(pageUrl || 'https://example.com/pochaho-demo', shareBlurb)
  }, [pageUrl, shareBlurb])

  return (
    <div className="ending-screen" role="dialog" aria-modal="true" aria-labelledby="ending-title">
      <div className="ending-screen__panel">
        <p className={`ending-screen__badge ending-screen__badge--${kind}`}>
          {kind === 'failure' ? 'ПРЕКРАЩЕНИЕ ПОЛНОМОЧИЙ' : 'ИТОГ ЗАФИКСИРОВАН'}
        </p>
        <h1 id="ending-title" className="ending-screen__title">
          {title}
        </h1>
        <p className="ending-screen__body">{body}</p>
        {rewards ? (
          <section className="ending-screen__rewards" aria-label="Итоги назначения">
            <h2>Наследие назначения</h2>
            <ul>
              <li>Репутация института: {rewards.reputationDelta >= 0 ? `+${rewards.reputationDelta}` : rewards.reputationDelta}</li>
              {rewards.archiveEntries.map((entry) => (
                <li key={entry}>Архив: {entry}</li>
              ))}
              {rewards.unlockedDepartments.map((department) => (
                <li key={department}>Открыт отдел: {DEPARTMENT_LABELS[department]}</li>
              ))}
              {rewards.unlockedProjects.map((project) => (
                <li key={project}>Доступен проект: {PROJECT_LABELS[project]}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <section className="ending-screen__share" aria-label="Поделиться итогом">
          <p className="ending-screen__share-label">Служебная выписка</p>
          <p className="ending-screen__share-preview">
            Текст для пересылки коллегам (или внешним кураторам). Ниже — готовая формулировка.
          </p>
          <p className="ending-screen__share-preview ending-screen__share-preview--mono">{shareBlurb}</p>
          <div className="ending-screen__share-actions">
            <button type="button" className="ending-screen__share-button" onClick={() => void handleCopy()}>
              Скопировать текст
            </button>
            <button type="button" className="ending-screen__share-button" onClick={() => void handleWebShare()}>
              Поделиться…
            </button>
            <button type="button" className="ending-screen__share-button" onClick={handleTelegramShare}>
              В Telegram
            </button>
          </div>
          {copyHint ? <p className="ending-screen__share-hint">{copyHint}</p> : null}
        </section>
        <button type="button" className="ending-screen__restart" onClick={onRestart}>
          Новое назначение
        </button>
      </div>
    </div>
  )
}
