import { useState } from 'react'
import { useRelay } from '../../hooks/useRelay'
import { CHART_HEIGHT, CHART_WIDTH } from './chartConstants'

export default function Kind1CountChart() {
  const { isConnected, kind1CountSamples } = useRelay()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (!isConnected || kind1CountSamples.length === 0) {
    return null
  }

  const n = kind1CountSamples.length
  const minC = Math.min(...kind1CountSamples)
  const maxC = Math.max(...kind1CountSamples)
  const range = maxC - minC || 1
  const points = kind1CountSamples
    .map((c, i) => {
      const x = (n === 1 ? 0 : i / (n - 1)) * CHART_WIDTH
      const y = CHART_HEIGHT - ((c - minC) / range) * (CHART_HEIGHT - 4) - 2
      return `${x},${y}`
    })
    .join(' ')

  const totalLastMinute = kind1CountSamples.reduce((a, b) => a + b, 0)
  const lastSecond = kind1CountSamples[kind1CountSamples.length - 1] ?? 0
  const hoverValue = hoverIndex !== null ? kind1CountSamples[hoverIndex] : null

  return (
    <article className="flex flex-col gap-2 p-4 rounded-lg bg-[var(--bg)] border border-[var(--border)] w-full min-h-[120px]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          Kind 1 activity
          <span
            className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-serif italic leading-none text-[var(--text-muted)]"
            title="last 10 min, no NIP-45"
            aria-label="Info: last 10 min, no NIP-45"
          >
            i
          </span>
        </span>
        <span className="text-sm font-mono text-[var(--text)]">{totalLastMinute} in 10 min · {lastSecond}/s</span>
      </div>
      <div className="relative w-full h-[80px]">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
          aria-hidden
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-violet-500 dark:text-violet-400"
            points={points}
          />
          {kind1CountSamples.map((_, i) => (
            <rect
              key={i}
              x={(i * CHART_WIDTH) / n}
              y={0}
              width={CHART_WIDTH / n + 1}
              height={CHART_HEIGHT}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              aria-hidden
            />
          ))}
        </svg>
        {hoverValue !== null && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute bottom-0 px-2 py-1 text-xs font-mono bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-lg text-[var(--text)] z-10"
            style={{ left: `${((hoverIndex + 0.5) / n) * 100}%`, transform: 'translate(-50%, -100%)' }}
            role="tooltip"
          >
            Events: {hoverValue}/s
          </div>
        )}
      </div>
    </article>
  )
}
