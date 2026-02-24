import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLog } from '../../contexts/LogContext'
import { useRelay } from '../../hooks/useRelay'
import { useNIP11 } from '../../hooks/useNIP11'
import { nip19 } from 'nostr-tools'

const RELAY_SOFTWARE_WITHOUT_NIP_25000 = ['nostr-rs-relay']

function relaySupportsNip25000(software: string | undefined): boolean {
  if (!software?.trim()) return true
  const slug = software.toLowerCase().replace(/\s+/g, ' ')
  return !RELAY_SOFTWARE_WITHOUT_NIP_25000.some((name) => slug.includes(name))
}

export default function WhitelistManager() {
  const { isAuthenticated, pubkey: authPubkey, signEvent } = useAuth()
  const { addLog } = useLog()
  const { isConnected, sendRelayEvent, url: relayUrl } = useRelay()
  const { metadata, loading: nip11Loading } = useNIP11()
  const [pubkeys, setPubkeys] = useState<string[]>([''])
  const [allowAll, setAllowAll] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const addPubkeyField = () => {
    setPubkeys([...pubkeys, ''])
  }

  const removePubkeyField = (index: number) => {
    setPubkeys(pubkeys.filter((_, i) => i !== index))
  }

  const updatePubkey = (index: number, value: string) => {
    const updated = [...pubkeys]
    updated[index] = value
    setPubkeys(updated)
  }

  const normalizePubkey = (input: string): string | null => {
    const trimmed = input.trim()
    if (!trimmed) return null

    if (trimmed.startsWith('npub1')) {
      try {
        const decoded = nip19.decode(trimmed)
        if (decoded.type === 'npub') {
          return decoded.data as string
        }
      } catch {
        return null
      }
    }

    if (/^[0-9a-f]{64}$/i.test(trimmed)) {
      return trimmed.toLowerCase()
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!isAuthenticated || !authPubkey) {
      const msg = 'Not authenticated'
      setError(msg)
      addLog('error', msg, 'Whitelist')
      return
    }

    if (!isConnected) {
      const msg = 'Not connected to relay'
      setError(msg)
      addLog('error', msg, 'Whitelist')
      return
    }

    const normalizedPubkeys = pubkeys
      .map(normalizePubkey)
      .filter((pk): pk is string => pk !== null)

    if (!allowAll && normalizedPubkeys.length === 0) {
      const msg = 'At least one valid pubkey required or enable "Allow all"'
      setError(msg)
      addLog('error', msg, 'Whitelist')
      return
    }

    setLoading(true)

    try {
      const content = allowAll
        ? { allowed_pubkeys: [] as string[], allow_all: true }
        : { allowed_pubkeys: normalizedPubkeys }

      const unsignedEvent = {
        kind: 25000,
        content: JSON.stringify(content),
        tags: [['d', 'whitelist']],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: authPubkey
      }

      const signedEvent = await signEvent(unsignedEvent)
      await sendRelayEvent(signedEvent)
      
      setSuccess(true)
      setPubkeys([''])
      
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send event'
      setError(message)
      addLog('error', message, 'Whitelist')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <section className="flex flex-col gap-4 p-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
        <header>
          <h2 className="text-xl font-semibold text-[var(--text)]">Whitelist Management</h2>
        </header>
        <p className="text-[var(--text-muted)]">Please authenticate first</p>
      </section>
    )
  }

  const nip25000Supported = relayUrl && relaySupportsNip25000(metadata?.software)

  return (
    <section
      className={`flex flex-col gap-4 p-6 rounded-lg border transition-colors ${
        nip25000Supported
          ? 'bg-[var(--bg-secondary)] border-[var(--border)]'
          : 'bg-[var(--bg)] border-[var(--border)] opacity-60 pointer-events-none'
      }`}
    >
      <header>
        <h2 className="text-xl font-semibold text-[var(--text)]">Whitelist Management</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Manage allowed pubkeys for the relay (Kind 25000 event). Actual behavior depends on the relay configuration
          and its admin keys.
        </p>
      </header>

      {isConnected && !nip11Loading && !metadata && (
        <article className="p-3 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)]">
          <p className="text-sm text-[var(--text-muted)]">
            Relay metadata (NIP-11) unavailable; cannot determine whether this relay supports NIP 25000 whitelist.
          </p>
        </article>
      )}

      {!nip25000Supported && (
        <article className="p-3 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)]">
          <p className="text-sm text-[var(--text-muted)]">No NIP 25000 support</p>
        </article>
      )}

      {nip25000Supported && error && (
        <article className="p-3 rounded-md border border-red-800 dark:border-red-400 bg-red-950/20 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </article>
      )}

      {nip25000Supported && success && (
        <article className="p-3 rounded-md border border-green-800 dark:border-green-500 bg-green-950/20 dark:bg-green-950/30">
          <p className="text-sm text-green-700 dark:text-green-300">Whitelist event accepted by relay</p>
        </article>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <article className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={allowAll}
              onClick={() => !loading && setAllowAll((v) => !v)}
              disabled={loading}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--text-muted)] focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)] disabled:opacity-50 ${
                allowAll
                  ? 'border-green-600 bg-green-600 dark:border-green-500 dark:bg-green-500'
                  : 'border-[var(--border)] bg-[var(--bg)]'
              }`}
            >
              <span
                className={`pointer-events-none absolute top-0.5 inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  allowAll ? 'left-[1.375rem]' : 'left-0.5'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-[var(--text-muted)]">Allow all (no whitelist)</span>
          </label>

          <label className="text-sm font-medium text-[var(--text-muted)]">
            Allowed pubkeys (npub or hex) – add new npubs here
          </label>
          {pubkeys.map((pubkey, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={pubkey}
                onChange={(e) => updatePubkey(index, e.target.value)}
                placeholder="npub1... or hex"
                className="flex-1 px-4 py-2 border border-[var(--border)] rounded-md bg-[var(--bg)] text-[var(--text)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--text-muted)] disabled:opacity-60"
                disabled={loading || allowAll}
              />
              {pubkeys.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePubkeyField(index)}
                  className="px-3 py-2 text-[var(--text-muted)] border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] hover:border-[var(--text-muted)] transition-colors disabled:opacity-50"
                  disabled={loading || allowAll}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addPubkeyField}
            className="self-start px-4 py-2 text-sm text-[var(--text-muted)] border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] hover:border-[var(--text-muted)] transition-colors disabled:opacity-50"
            disabled={loading || allowAll}
          >
            + Add pubkey
          </button>
        </article>

        <button
          type="submit"
          disabled={loading || !isConnected}
          className="px-4 py-2 font-medium text-[var(--text)] border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] hover:border-[var(--text-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending...' : 'Update whitelist'}
        </button>
      </form>
    </section>
  )
}
