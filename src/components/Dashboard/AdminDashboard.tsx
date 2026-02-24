import { useRelay } from '../../hooks/useRelay'
import ConnectionsList from './ConnectionsList'
import ErrorConsole from './ErrorConsole'
import Kind1CountChart from './Kind1CountChart'
import RelayLatencyChart from './RelayLatencyChart'
import RelayMetadata from '../Relay/RelayMetadata'
import RelayStats from './RelayStats'
import WhitelistManager from './WhitelistManager'

export default function AdminDashboard() {
  const { isConnected } = useRelay()

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
