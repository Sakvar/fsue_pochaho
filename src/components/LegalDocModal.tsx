import { useEffect } from 'react'
import assets from '@legal/ASSETS.md?raw'
import privacy from '@legal/PRIVACY_POLICY.md?raw'
import terms from '@legal/TERMS_OF_SERVICE.md?raw'

const DOCS = {
  privacy,
  terms,
  assets,
} as const

export type LegalDocId = keyof typeof DOCS

const TITLES: Record<LegalDocId, string> = {
  privacy: 'Конфиденциальность',
  terms: 'Условия использования',
  assets: 'Ассеты и права',
}

type Props = {
  doc: LegalDocId
  onClose: () => void
}

export function LegalDocModal({ doc, onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="legal-modal-layer" role="dialog" aria-modal="true" aria-labelledby="legal-doc-title" onClick={onClose}>
      <div className="legal-modal" onClick={(event) => event.stopPropagation()}>
        <div className="legal-modal__header">
          <h2 id="legal-doc-title" className="legal-modal__title">
            {TITLES[doc]}
          </h2>
          <button type="button" className="legal-modal__close" onClick={onClose} aria-label="Закрыть">
            Закрыть
          </button>
        </div>
        <pre className="legal-modal__body">{DOCS[doc]}</pre>
      </div>
    </div>
  )
}
