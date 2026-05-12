import { trackSupportClick } from '@/analytics'

function supportHref(): string | null {
  const raw = import.meta.env.VITE_SUPPORT_URL
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null
}

type Props = {
  onClose: () => void
}

export function AboutSupportPanel({ onClose }: Props) {
  const href = supportHref()

  const onSupportClick = () => {
    if (href) trackSupportClick({ target: 'about', href })
  }

  return (
    <div className="about-layer" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={onClose}>
      <div className="about-panel" onClick={(event) => event.stopPropagation()}>
        <div className="about-panel__header">
          <h2 id="about-title" className="about-panel__title">
            О проекте
          </h2>
          <button type="button" className="about-panel__close" onClick={onClose} aria-label="Закрыть">
            Закрыть
          </button>
        </div>
        <div className="about-panel__body">
          <p>
            «ПОЧАХО» — короткая нарративная игра про закрытый институт: подписи, ресурсы и последствия, которые не
            стираются ластиком. Это демонстрационный фронтенд-MVP без серверного сохранения: ваш прогресс живёт в
            браузере.
          </p>
          <p>
            Если вам откликается тон и вы хотите, чтобы сценариев и полировки стало больше — можно поддержать
            разработку. Ссылка задаётся переменной окружения <code className="about-panel__code">VITE_SUPPORT_URL</code>{' '}
            при сборке.
          </p>
          <p className="about-panel__actions">
            {href ? (
              <a
                className="about-panel__support-link"
                href={href}
                target="_blank"
                rel="noreferrer"
                onClick={onSupportClick}
              >
                Поддержать объект
              </a>
            ) : (
              <span className="about-panel__support-placeholder">Ссылка на донат не настроена (нет VITE_SUPPORT_URL).</span>
            )}
          </p>
          <section className="about-panel__section" aria-label="Дорожная карта">
            <h3>Дорожная карта (кратко)</h3>
            <ul>
              <li>Больше сценариев и скрытых исходов</li>
              <li>Звук и атмосфера</li>
              <li>Валидация покупок для премиум-контента в Telegram</li>
            </ul>
          </section>
          <section className="about-panel__section" aria-label="Известные ограничения">
            <h3>Известные ограничения</h3>
            <ul>
              <li>PWA в режиме разработки может отличаться от продакшн-сборки</li>
              <li>Локальное сохранение легко сбросить очисткой данных сайта</li>
              <li>Опциональная аналитика требует CORS-настройки вашего эндпоинта</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
