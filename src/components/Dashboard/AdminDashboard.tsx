import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRelay } from '../../hooks/useRelay'
import { nip19 } from 'nostr-tools'
import type { Event } from 'nostr-tools'
import AdminErrorLog, {
  eventToAdminErrorEntry,
  type AdminErrorEntry,
} from './AdminErrorLog'
import ConnectionsList from './ConnectionsList'
import ErrorConsole from './ErrorConsole'
import Kind1CountChart from './Kind1CountChart'
import RelayLatencyChart from './RelayLatencyChart'
import RelayMetadata from '../Relay/RelayMetadata'
import RelayStats from './RelayStats'
import WhitelistManager from './WhitelistManager'

const MAX_ADMIN_ERRORS = 100

function toHexPubkey(pubkey: string | null): string | null {
  if (!pubkey) return null
  if (pubkey.length === 64 && /^[a-fA-F0-9]+$/.test(pubkey)) return pubkey
  try {
    const decoded = nip19.decode(pubkey)
    if (decoded.type === 'npub') return decoded.data
    return null
  } catch {
    return null
  }
}

export default function AdminDashboard() {
  const { isConnected, subscribeAdminErrors } = useRelay()
  const { pubkey } = useAuth()
  const [adminErrors, setAdminErrors] = useState<AdminErrorEntry[]>([])

  const hexPubkey = toHexPubkey(pubkey)

  useEffect(() => {
    if (!isConnected || !hexPubkey) return
    return subscribeAdminErrors(hexPubkey, (ev: Event) => {
      setAdminErrors((prev) => {
        if (prev.some((e) => e.id === ev.id)) return prev
        const next = [eventToAdminErrorEntry(ev), ...prev]
        return next.slice(0, MAX_ADMIN_ERRORS)
      })
    })
  }, [isConnected, hexPubkey, subscribeAdminErrors])

  const clearAdminErrors = useCallback(() => setAdminErrors([]), [])

  return (
    <section className="flex flex-col gap-6">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {isConnected ? (
          <>
            <RelayLatencyChart />
            <Kind1CountChart />
          </>
        ) : (
          <p className="text-[var(--text-muted)] py-4 lg:col-span-2">
            Connect to a relay to see latency and activity charts.
          </p>
        )}
      </section>

      <AdminErrorLog
        events={adminErrors}
        onClear={clearAdminErrors}
        isConnected={isConnected}
        hasAdminPubkey={!!hexPubkey}
      />

      <ErrorConsole />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RelayStats />
        <ConnectionsList />
      </section>

      <RelayMetadata />

      <WhitelistManager />
    </section>
  )
}
