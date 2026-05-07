import type { Card } from '@/data/types'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

type Props = {
  card: Card | null
}

export function DecisionCard({ card }: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="decision-card-shell">
      <AnimatePresence mode="wait">
        {card ? (
          <motion.article
            key={card.id}
            className="decision-card"
            initial={reduceMotion ? false : { opacity: 0, y: 14, rotate: -0.4 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, rotate: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10, rotate: 0.3 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="decision-card__header">
              <p className="decision-card__speaker">{card.speaker}</p>
              <h2 className="decision-card__title">{card.title}</h2>
            </header>
            <p className="decision-card__body">{card.body}</p>
            <footer className="decision-card__meta">
              <span className="decision-card__stamp">Экз. единственный</span>
              <span className="decision-card__id">Гриф: совершенно секретно</span>
            </footer>
          </motion.article>
        ) : (
          <motion.p
            key="empty"
            className="decision-card decision-card--empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Карточка недоступна. Проверьте сохранение.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
