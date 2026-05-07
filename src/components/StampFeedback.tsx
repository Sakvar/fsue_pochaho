import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'

type Props = {
  message: string | null
  onDone: () => void
}

export function StampFeedback({ message, onDone }: Props) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!message) return
    const t = window.setTimeout(() => onDone(), reduceMotion ? 400 : 1100)
    return () => window.clearTimeout(t)
  }, [message, onDone, reduceMotion])

  return (
    <div className="stamp-layer" aria-live="polite">
      <AnimatePresence>
        {message ? (
          <motion.div
            key={message}
            className="stamp-feedback"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.2, rotate: -8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -6 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            {message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
