import type { LegalDocId } from '@/components/LegalDocModal'

type Props = {
  onOpenLegal: (doc: LegalDocId) => void
  onOpenAbout: () => void
}

export function AppFooter({ onOpenLegal, onOpenAbout }: Props) {
  return (
    <footer className="app-footer" aria-label="Служебные ссылки">
      <button type="button" className="app-footer__link" onClick={() => onOpenLegal('privacy')}>
        Конфиденциальность
      </button>
      <span className="app-footer__sep" aria-hidden>
        ·
      </span>
      <button type="button" className="app-footer__link" onClick={() => onOpenLegal('terms')}>
        Условия
      </button>
      <span className="app-footer__sep" aria-hidden>
        ·
      </span>
      <button type="button" className="app-footer__link" onClick={() => onOpenLegal('assets')}>
        Ассеты
      </button>
      <span className="app-footer__sep" aria-hidden>
        ·
      </span>
      <button type="button" className="app-footer__link" onClick={onOpenAbout}>
        О проекте / Поддержать
      </button>
    </footer>
  )
}
