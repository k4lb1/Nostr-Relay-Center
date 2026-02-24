import { useEffect, useState } from 'react'
import { useRelay } from '../../hooks/useRelay'

const COUNT_KINDS = [0, 1, 3, 5, 7] as const

export default function RelayStats() {
  const { isConnected, requestCount, recentKind1Events } = useRelay()
  const [countsByKind, setCountsByKind] = useState<Record<number, number | null>>({})

  useEffect(() => {
    if (!isConnected) {
      setCountsByKind({})
      return
    }
    Promise.all(
      COUNT_KINDS.map(async (kind) => {
        const n = await requestCount({ kinds: [kind] })
        return [kind, n] as const
      })
    ).then((pairs) => {
      setCountsByKind(Object.fromEntries(pairs))
    })
  }, [isConnected, requestCount])

  if (!isConnected) {
    return (
      <section className="flex flex-col gap-4 p-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
        <header>
          <h2 className="text-xl font-semibold text-[var(--text)]">Relay statistics</h2>
        </header>
        <p className="text-[var(--text-muted)]">Connect to a relay to see statistics</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4 p-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
      <header>
        <h2 className="text-xl font-semibold text-[var(--text)]">Relay statistics</h2>
      </header>

      <article className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">Events per kind (NIP-45 COUNT)</span>
          <ul className="flex flex-col gap-1 text-sm">
            {COUNT_KINDS.map((kind) => (
              <li
                key={kind}
                className="flex justify-between gap-2 p-2 rounded-md bg-[var(--bg)] border border-[var(--border)]"
              >
                <span className="text-[var(--text-muted)]">Kind {kind}</span>
                <span className="text-[var(--text)] font-mono tabular-nums">
                  {countsByKind[kind] === undefined ? '…' : countsByKind[kind] === null ? '—' : countsByKind[kind].toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
          {Object.keys(countsByKind).length > 0 && Object.values(countsByKind).every((v) => v === null) && (
            <span className="text-xs text-red-600 dark:text-red-400">
              Relay may not support NIP-45 COUNT
            </span>
          )}
        </div>

        {recentKind1Events.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
            <span className="text-xs font-medium text-[var(--text-muted)]">Recent activity (Kind 1)</span>
            <ul className="flex flex-col gap-1 text-sm">
              {recentKind1Events.map((ev) => (
                <li
                  key={ev.id}
                  className="font-mono text-xs text-[var(--text-muted)] truncate"
                  title={ev.content || undefined}
                >
                  {ev.content?.slice(0, 80) || ev.id.slice(0, 16)}…
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </section>
  )
}
