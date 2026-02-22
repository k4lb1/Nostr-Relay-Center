import { useState } from 'react'
import { useRelay } from '../../hooks/useRelay'
import { CHART_HEIGHT, CHART_WIDTH } from './chartConstants'

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m} min ${s} s` : `${m} min`
}

export default function ConnectionDurationChart() {
  const { isConnected, connectedAt, durationSamples } = useRelay()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (!isConnected || connectedAt === null || durationSamples.length === 0) {
    return null
  }

  const currentDuration = (Date.now() - connectedAt) / 1000
  const n = durationSamples.length
  const minSec = Math.min(...durationSamples)
  const maxSec = Math.max(...durationSamples)
  const range = maxSec - minSec || 1

  const points = durationSamples
    .map((sec, i) => {
      const x = (n === 1 ? 0 : i / (n - 1)) * CHART_WIDTH
      const y = CHART_HEIGHT - ((sec - minSec) / range) * (CHART_HEIGHT - 4) - 2
      return `${x},${y}`
    })
    .join(' ')

  const hoverValue = hoverIndex !== null ? durationSamples[hoverIndex] : null

  return (
    <article className="flex flex-col gap-2 p-4 rounded-lg bg-[var(--bg)] border border-[var(--border)] w-full min-h-[120px]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          Connection duration
          <span
            className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-serif italic leading-none text-[var(--text-muted)]"
            title="last 10 min — seconds connected at each moment"
            aria-label="Info: last 10 min — seconds connected at each moment"
          >
            i
          </span>
        </span>
        <span className="text-sm font-mono text-[var(--text)]">{formatDuration(currentDuration)}</span>
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
            className="text-gray-500 dark:text-gray-400"
            points={points}
          />
          {durationSamples.map((_, i) => (
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
            Duration: {formatDuration(hoverValue)}
          </div>
        )}
      </div>
    </article>
  )
}
