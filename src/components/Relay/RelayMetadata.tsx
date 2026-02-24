import { useEffect, useState } from 'react'
import { useNIP11 } from '../../hooks/useNIP11'
import { useRelay } from '../../hooks/useRelay'
import { KNOWN_NIPS } from '../../config/nips'

function Field({
  label,
  children,
  valueClassName,
}: {
  label: string
  children: React.ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
      <span className={valueClassName ?? 'text-[var(--text)]'}>{children}</span>
    </div>
  )
}

export default function RelayMetadata() {
  const { url, isConnected } = useRelay()
  const { metadata, loading, error, fetchMetadata } = useNIP11()
  const [showOtherNips, setShowOtherNips] = useState(false)

  useEffect(() => {
    if (isConnected && url) {
      fetchMetadata(url)
    }
  }, [isConnected, url])

  if (!isConnected) {
    return null
  }

  if (loading) {
    return (
      <section className="flex flex-col gap-4 p-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
        <header>
          <h2 className="text-xl font-semibold text-[var(--text)]">Relay metadata</h2>
        </header>
        <p className="text-[var(--text-muted)]">Loading metadata...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="flex flex-col gap-4 p-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
        <header>
          <h2 className="text-xl font-semibold text-[var(--text)]">Relay metadata</h2>
        </header>
        <article className="p-3 rounded-md border border-red-800 dark:border-red-400 bg-red-950/20 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </article>
      </section>
    )
  }

  if (!metadata) {
    return null
  }

  const supportedNips = metadata.supported_nips ?? []
  const hasSupportedNips = supportedNips.length > 0
  const supportedNipSet = new Set(supportedNips)

  const nipStatus = hasSupportedNips
    ? KNOWN_NIPS.map((nip) => {
        const isSupported = supportedNipSet.has(nip.id)
        const status: 'supported' | 'missingCritical' | 'missingOther' = isSupported
          ? 'supported'
          : nip.importance === 'critical'
            ? 'missingCritical'
            : 'missingOther'
        return { ...nip, status }
      })
    : []

  const supportedList = nipStatus
    .filter((n) => n.status === 'supported')
    .sort((a, b) => a.id - b.id)

  const missingCriticalList = nipStatus
    .filter((n) => n.status === 'missingCritical')
    .sort((a, b) => a.id - b.id)

  const missingOtherList = nipStatus
    .filter((n) => n.status === 'missingOther')
    .sort((a, b) => a.id - b.id)

  return (
    <section className="flex flex-col gap-4 p-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
      <header>
        <h2 className="text-xl font-semibold text-[var(--text)]">Relay metadata (NIP-11)</h2>
      </header>

      <article className="flex flex-col gap-3">
        {metadata.name && <Field label="Name">{metadata.name}</Field>}
        {metadata.description && <Field label="Description">{metadata.description}</Field>}
        {metadata.pubkey && (
          <Field label="Pubkey" valueClassName="font-mono text-sm text-[var(--text)] break-all">
            {metadata.pubkey}
          </Field>
        )}
        {metadata.contact && <Field label="Contact">{metadata.contact}</Field>}
        {metadata.software && <Field label="Software">{metadata.software}</Field>}
        {metadata.version && <Field label="Version">{metadata.version}</Field>}
        {hasSupportedNips && (
          <Field label="Supported NIPs" valueClassName="text-[var(--text)] font-mono text-sm">
            {supportedNips.map((n) => `NIP-${n}`).join(', ')}
          </Field>
        )}

        {nipStatus.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
            <span className="text-sm font-medium text-[var(--text-muted)]">NIP support</span>
            <div className="flex flex-col gap-1 text-sm">
              {supportedList.map((nip) => (
                <div key={nip.id} className="flex justify-between gap-2">
                  <span className="text-[var(--text)]">
                    {nip.code} – {nip.label}
                  </span>
                  <span className="text-green-500 dark:text-green-400">supported</span>
                </div>
              ))}
              {missingCriticalList.map((nip) => (
                <div key={nip.id} className="flex justify-between gap-2">
                  <span className="text-[var(--text)]">
                    {nip.code} – {nip.label}
                  </span>
                  <span className="text-red-500 dark:text-red-400">missing</span>
                </div>
              ))}
              {missingOtherList.length > 0 && (
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setShowOtherNips((v) => !v)}
                    className="self-start text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] underline underline-offset-2"
                  >
                    {showOtherNips ? 'Hide other NIPs' : 'Show other NIPs'}
                  </button>
                  {showOtherNips && (
                    <div className="flex flex-col gap-1">
                      {missingOtherList.map((nip) => (
                        <div key={nip.id} className="flex justify-between gap-2">
                          <span className="text-[var(--text)]">
                            {nip.code} – {nip.label}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">not listed</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {metadata.limitation && (
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
            <span className="text-sm font-medium text-[var(--text-muted)]">Limitations</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {metadata.limitation.max_message_length && (
                <div>
                  <span className="text-[var(--text-muted)]">Max. message length: </span>
                  <span className="text-[var(--text)]">{metadata.limitation.max_message_length}</span>
                </div>
              )}
              {metadata.limitation.max_subscriptions && (
                <div>
                  <span className="text-[var(--text-muted)]">Max. subscriptions: </span>
                  <span className="text-[var(--text)]">{metadata.limitation.max_subscriptions}</span>
                </div>
              )}
              {metadata.limitation.max_filters && (
                <div>
                  <span className="text-[var(--text-muted)]">Max. filters: </span>
                  <span className="text-[var(--text)]">{metadata.limitation.max_filters}</span>
                </div>
              )}
              {metadata.limitation.max_limit && (
                <div>
                  <span className="text-[var(--text-muted)]">Max. limit: </span>
                  <span className="text-[var(--text)]">{metadata.limitation.max_limit}</span>
                </div>
              )}
              {metadata.limitation.auth_required !== undefined && (
                <div>
                  <span className="text-[var(--text-muted)]">Auth required: </span>
                  <span className="text-[var(--text)]">
                    {metadata.limitation.auth_required ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
              {metadata.limitation.payment_required !== undefined && (
                <div>
                  <span className="text-[var(--text-muted)]">Payment required: </span>
                  <span className="text-[var(--text)]">
                    {metadata.limitation.payment_required ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
              {metadata.limitation.restricted_writes !== undefined && (
                <div>
                  <span className="text-[var(--text-muted)]">Restricted writes: </span>
                  <span className="text-[var(--text)]">
                    {metadata.limitation.restricted_writes ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
              {metadata.limitation.max_content_length && (
                <div>
                  <span className="text-[var(--text-muted)]">Max. content length: </span>
                  <span className="text-[var(--text)]">{metadata.limitation.max_content_length}</span>
                </div>
              )}
              {metadata.limitation.min_pow_difficulty !== undefined && (
                <div>
                  <span className="text-[var(--text-muted)]">Min. PoW difficulty: </span>
                  <span className="text-[var(--text)]">{metadata.limitation.min_pow_difficulty}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {metadata.relay_countries && metadata.relay_countries.length > 0 && (
          <Field label="Relay countries">{metadata.relay_countries.join(', ')}</Field>
        )}
        {metadata.posting_policy && (
          <Field label="Posting policy">{metadata.posting_policy}</Field>
        )}
        {metadata.payments_url && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--text-muted)]">Payments URL</span>
            <a
              href={metadata.payments_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text)] underline break-all"
            >
              {metadata.payments_url}
            </a>
          </div>
        )}

        {metadata.fees && (
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
            <span className="text-sm font-medium text-[var(--text-muted)]">Fees</span>
            <div className="flex flex-col gap-1 text-sm">
              {metadata.fees.admission?.map((fee, i) => (
                <div key={`admission-${i}`}>
                  <span className="text-[var(--text-muted)]">Admission: </span>
                  <span className="text-[var(--text)]">{fee.amount} {fee.unit}</span>
                </div>
              ))}
              {metadata.fees.subscription?.map((fee, i) => (
                <div key={`sub-${i}`}>
                  <span className="text-[var(--text-muted)]">Subscription: </span>
                  <span className="text-[var(--text)]">{fee.amount} {fee.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {metadata.tags && metadata.tags.length > 0 && (
          <Field label="Tags">{metadata.tags.join(', ')}</Field>
        )}
      </article>
    </section>
  )
}
