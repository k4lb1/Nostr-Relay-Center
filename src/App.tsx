import { AuthProvider } from './contexts/AuthContext'
import { LogProvider } from './contexts/LogContext'
import { NIP11Provider } from './contexts/NIP11Context'
import { RelayProvider } from './contexts/RelayContext'
import { useAuth } from './contexts/AuthContext'
import AppHeader from './components/AppHeader'
import AppFooter from './components/AppFooter'
import NSECAuth from './components/Auth/NSECAuth'
import RelayConnection from './components/Relay/RelayConnection'
import AdminDashboard from './components/Dashboard/AdminDashboard'

function SessionFooter() {
  const { authMode, logout } = useAuth()
  return (
    <section className="flex flex-col gap-4 p-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
      <header>
        <h2 className="text-xl font-semibold text-[var(--text)]">Session</h2>
        {authMode === 'nip46' && (
          <p className="text-sm text-[var(--text-muted)] mt-1">Connected via Nostr Bunker (NIP-46)</p>
        )}
      </header>
      <button
        type="button"
        onClick={logout}
        className="self-start px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-500 dark:border-red-400 rounded-md bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
      >
        Log out
      </button>
    </section>
  )
}

function AppContent() {
  const { isAuthenticated } = useAuth()

  return (
    <>
    <main className="min-h-screen bg-[var(--bg)] pt-24 pb-12">
      <AppHeader />
      <section className="max-w-2xl md:max-w-4xl xl:max-w-6xl mx-auto px-6 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Nostr Relay Center</h1>
        {!isAuthenticated && <NSECAuth />}
        {isAuthenticated && (
          <>
            <RelayConnection />
            <AdminDashboard />
            <SessionFooter />
          </>
        )}
      </section>
    </main>
    <AppFooter />
    </>
  )
}

function App() {
  return (
    <LogProvider>
      <AuthProvider>
        <RelayProvider>
          <NIP11Provider>
            <AppContent />
          </NIP11Provider>
        </RelayProvider>
      </AuthProvider>
    </LogProvider>
  )
}

export default App
