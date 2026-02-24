import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createRelayConnection, sendEvent, requestCount as relayRequestCount, subscribeToRecentEvents, measureRoundTrip } from '../services/relay'
import type { Event } from 'nostr-tools'
import { useLog } from './LogContext'

const PING_INTERVAL_MS = 1000
const SAMPLES_LAST_10_MIN = 600

export interface UseRelayReturn {
  url: string | null
  isConnected: boolean
  error: string | null
  pingSamples: number[]
  connectedAt: number | null
  durationSamples: number[]
  kind1CountSamples: number[]
  recentKind1Events: Event[]
  connect: (relayUrl: string) => Promise<void>
  disconnect: () => void
  sendRelayEvent: (event: Event) => Promise<void>
  requestCount: (filter: { kinds?: number[]; since?: number; until?: number }) => Promise<number | null>
  subscribeRecent: (filter: { kinds: number[]; limit?: number }, onEvent: (event: Event) => void) => () => void
}

interface RelayContextType extends UseRelayReturn {}

const RelayContext = createContext<RelayContextType | undefined>(undefined)

export function RelayProvider({ children }: { children: React.ReactNode }) {
  const { addLog } = useLog()
  const [url, setUrl] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pingSamples, setPingSamples] = useState<number[]>([])
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [durationSamples, setDurationSamples] = useState<number[]>([])
  const [kind1CountSamples, setKind1CountSamples] = useState<number[]>([])
  const [recentKind1Events, setRecentKind1Events] = useState<Event[]>([])
  const kind1EventTimesRef = useRef<number[]>([])
  const connectedAtRef = useRef<number | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(async (relayUrl: string) => {
    try {
      setError(null)
      if (!relayUrl.trim()) throw new Error('Relay URL is required')
      let normalizedUrl = relayUrl.trim()
      if (!normalizedUrl.startsWith('ws://') && !normalizedUrl.startsWith('wss://')) {
        normalizedUrl = `wss://${normalizedUrl}`
      }
      if (wsRef.current) wsRef.current.close()
      const ws = await createRelayConnection(normalizedUrl)
      wsRef.current = ws
      const now = Date.now()
      connectedAtRef.current = now
      setConnectedAt(now)
      setUrl(normalizedUrl)
      setIsConnected(true)
      ws.onclose = () => {
        connectedAtRef.current = null
        setConnectedAt(null)
        setDurationSamples([])
        setKind1CountSamples([])
        setIsConnected(false)
        wsRef.current = null
      }
      ws.onerror = () => {
        setError('WebSocket error')
        addLog('error', 'WebSocket error', 'Relay')
        setIsConnected(false)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection error'
      setError(message)
      addLog('error', message, 'Relay')
      setIsConnected(false)
      wsRef.current = null
    }
  }, [addLog])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    connectedAtRef.current = null
    setConnectedAt(null)
    setDurationSamples([])
    setIsConnected(false)
    setUrl(null)
    setError(null)
    setPingSamples([])
    setKind1CountSamples([])
  }, [])

  const sendRelayEvent = useCallback(async (event: Event) => {
    if (!wsRef.current || !isConnected) throw new Error('Not connected to relay')
    await sendEvent(wsRef.current, event)
  }, [isConnected])

  const requestCount = useCallback(
    async (filter: { kinds?: number[]; since?: number; until?: number }) => {
      if (!wsRef.current || !isConnected) return null
      return relayRequestCount(wsRef.current, filter)
    },
    [isConnected]
  )

  const subscribeRecent = useCallback(
    (filter: { kinds: number[]; limit?: number }, onEvent: (event: Event) => void) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return () => {}
      return subscribeToRecentEvents(wsRef.current, filter, onEvent)
    },
    [isConnected]
  )

  useEffect(() => {
    if (!isConnected || !wsRef.current) return
    const run = () => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      const at = connectedAtRef.current
      if (at !== null) {
        setDurationSamples((prev) => [...prev.slice(1 - SAMPLES_LAST_10_MIN), (Date.now() - at) / 1000])
      }
      measureRoundTrip(ws).then((ms) => {
        if (ms !== null) {
          setPingSamples((prev) => [...prev.slice(1 - SAMPLES_LAST_10_MIN), ms])
        }
      })
    }
    run()
    const id = setInterval(run, PING_INTERVAL_MS)
    return () => clearInterval(id)
  }, [isConnected])

  useEffect(() => {
    if (!isConnected || !wsRef.current) return

    kind1EventTimesRef.current = []
    setKind1CountSamples([])
    setRecentKind1Events([])

    const unsub = subscribeToRecentEvents(wsRef.current, { kinds: [1], limit: 20 }, (ev) => {
      kind1EventTimesRef.current.push(Date.now())
      setRecentKind1Events((prev) => {
        const next = prev.some((e) => e.id === ev.id) ? prev : [ev, ...prev].slice(0, 5)
        return next
      })
    })

    const tick = () => {
      const now = Date.now()
      const cutoff = now - SAMPLES_LAST_10_MIN * 1000
      const times = kind1EventTimesRef.current.filter((t) => t >= cutoff)
      kind1EventTimesRef.current = times

      const counts = new Array(SAMPLES_LAST_10_MIN).fill(0)
      for (const t of times) {
        const secondsAgo = Math.floor((now - t) / 1000)
        if (secondsAgo >= 0 && secondsAgo < SAMPLES_LAST_10_MIN) {
          const idx = SAMPLES_LAST_10_MIN - 1 - secondsAgo
          counts[idx] += 1
        }
      }

      setKind1CountSamples(counts)
    }

    tick()
    const id = setInterval(tick, PING_INTERVAL_MS)

    return () => {
      unsub()
      clearInterval(id)
    }
  }, [isConnected])

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  return (
    <RelayContext.Provider
      value={{ url, isConnected, error, pingSamples, connectedAt, durationSamples, kind1CountSamples, recentKind1Events, connect, disconnect, sendRelayEvent, requestCount, subscribeRecent }}
    >
      {children}
    </RelayContext.Provider>
  )
}

export function useRelay(): RelayContextType {
  const ctx = useContext(RelayContext)
  if (ctx === undefined) throw new Error('useRelay must be used within RelayProvider')
  return ctx
}
