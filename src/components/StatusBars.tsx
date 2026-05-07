import type { MeterView } from '@/game/selectors'

type Props = {
  meters: MeterView[]
}

export function StatusBars({ meters }: Props) {
  return (
    <header className="status-bars" aria-label="Ресурсы объекта">
      <div className="status-bars__grid">
        {meters.map((m) => (
          <div key={m.key} className="meter">
            <div className="meter__head">
              <span className="meter__label">{m.shortLabel}</span>
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
          </div>
        ))}
      </div>
    </header>
  )
}
