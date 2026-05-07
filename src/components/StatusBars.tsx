import type { MeterView } from '@/game/selectors'
import { useEffect, useId, useRef, useState } from 'react'

type Props = {
  meters: MeterView[]
}

export function StatusBars({ meters }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const popupId = useId()

  useEffect(() => {
    if (!openKey) return

    const onPointerDown = (event: PointerEvent) => {
      const root = containerRef.current
      if (!root) return
      if (event.target instanceof Node && root.contains(event.target)) return
      setOpenKey(null)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenKey(null)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openKey])

  return (
    <header className="status-bars" aria-label="Ресурсы объекта">
      <div ref={containerRef} className="status-bars__grid">
        {meters.map((m) => {
          const isOpen = openKey === m.key
          const tipId = `${popupId}-${m.key}`
          return (
            <div key={m.key} className="meter">
              <div className="meter__head">
                <span className="meter__label">{m.shortLabel}</span>
                <button
                  type="button"
                  className="meter__info"
                  aria-label={`Что такое: ${m.label}`}
                  aria-expanded={isOpen}
                  aria-controls={tipId}
                  onClick={() => setOpenKey(isOpen ? null : m.key)}
                >
                  <span aria-hidden="true">i</span>
                </button>
                <span className="meter__value" aria-hidden>
                  {m.value}
                </span>
              </div>
              <div className="meter__track" role="presentation">
                <div
                  className="meter__fill"
                  style={{ width: `${m.value}%` }}
                  data-low={m.value < 25 ? 'true' : undefined}
                  data-high={m.key === 'kgbAttention' && m.value > 75 ? 'true' : undefined}
                />
              </div>
              {isOpen ? (
                <div id={tipId} className="meter__popup" role="dialog" aria-label={m.label}>
                  <div className="meter__popup-title">{m.label}</div>
                  <p className="meter__popup-body">{m.description}</p>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </header>
  )
}
