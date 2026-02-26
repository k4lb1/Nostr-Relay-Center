import { useEffect, useRef } from 'react'
import type { Event } from 'nostr-tools'

export interface AdminErrorEntry {
  id: string
  content: string
  createdAt: number
  eventId: string
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}

function ErrorEntry({ entry }: { entry: AdminErrorEntry }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-red-500/50 bg-red-950/20 dark:bg-red-950/40 p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="shrink-0 rounded bg-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
          Systemfehler
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {formatTime(entry.createdAt)}
        </span>
      </div>
      <p className="min-w-0 break-words font-mono text-sm text-red-200 dark:text-red-300">
        {entry.content}
      </p>
    </div>
  )
}

interface AdminErrorLogProps {
  events: AdminErrorEntry[]
  onClear: () => void
  isConnected: boolean
  hasAdminPubkey: boolean
}

export default function AdminErrorLog({
  events,
  onClear,
  isConnected,
  hasAdminPubkey,
}: AdminErrorLogProps) {
  const lastRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    lastRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  const emptyMessage = !isConnected
    ? 'Connect to a relay to receive admin error events.'
    : !hasAdminPubkey
      ? 'Log in to receive relay system errors (Kind 1984).'
      : 'No system errors yet.'

  return (
    <article className="flex flex-col gap-2 p-4 rounded-lg bg-[var(--bg)] border border-[var(--border)] w-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          Admin Error Log (Kind 1984)
          {events.length > 0 && (
            <span className="ml-2 text-red-500 dark:text-red-400">
              {events.length}
            </span>
          )}
        </span>
        {events.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div
        role="log"
        aria-live="polite"
        aria-label="Admin error log"
        className="max-h-[280px] overflow-y-auto rounded-md bg-[var(--bg-secondary)] dark:bg-black/80 p-3 space-y-2"
      >
        {events.length === 0 ? (
          <div className="text-[var(--text-muted)] py-4 text-sm">
            {emptyMessage}
          </div>
        ) : (
          events.map((entry) => (
            <div
              key={entry.id}
              ref={entry.id === events[events.length - 1]?.id ? lastRef : undefined}
            >
              <ErrorEntry entry={entry} />
            </div>
          ))
        )}
      </div>
    </article>
  )
}

export function eventToAdminErrorEntry(ev: Event): AdminErrorEntry {
  return {
    id: ev.id,
    content: ev.content,
    createdAt: ev.created_at,
    eventId: ev.id,
  }
}
