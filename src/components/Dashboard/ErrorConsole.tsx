import { useEffect, useRef } from 'react'
import { useLog } from '../../contexts/LogContext'
import type { LogEntry } from '../../contexts/LogContext'

const LEVEL_LABEL: Record<LogEntry['level'], string> = {
  error: '[ERR]',
  warn: '[WRN]',
  info: '[INF]',
}

function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function LogLine({ entry }: { entry: LogEntry }) {
  const levelClass =
    entry.level === 'error'
      ? 'text-red-500 dark:text-red-400'
      : entry.level === 'warn'
        ? 'text-amber-500 dark:text-amber-400'
        : 'text-[var(--text-muted)]'
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono text-sm leading-relaxed">
      <span className="shrink-0 text-[var(--text-muted)]">
        {formatTime(entry.time)}
      </span>
      <span className={`shrink-0 font-medium ${levelClass}`}>
        {LEVEL_LABEL[entry.level]}
      </span>
      {entry.source && (
        <span className="shrink-0 text-[var(--text-muted)]">
          {entry.source}
        </span>
      )}
      <span className="min-w-0 break-words text-[var(--text)]">
        {entry.message}
      </span>
    </div>
  )
}

export default function ErrorConsole() {
  const { logs, clearLogs } = useLog()
  const lastRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    lastRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <article className="flex flex-col gap-2 p-4 rounded-lg bg-[var(--bg)] border border-[var(--border)] w-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          Error Console
          {logs.length > 0 && (
            <span className="ml-2 text-[var(--text)]">{logs.length}</span>
          )}
        </span>
        {logs.length > 0 && (
          <button
            type="button"
            onClick={clearLogs}
            className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div
        role="log"
        aria-live="polite"
        aria-label="Error console log"
        className="max-h-[240px] overflow-y-auto rounded-md bg-[var(--bg-secondary)] dark:bg-black/80 p-3 font-mono text-sm"
      >
        {logs.length === 0 ? (
          <div className="text-[var(--text-muted)]">No errors yet.</div>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.id}
              ref={entry.id === logs[logs.length - 1]?.id ? lastRef : undefined}
            >
              <LogLine entry={entry} />
            </div>
          ))
        )}
      </div>
    </article>
  )
}
