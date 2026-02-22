import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useRelay } from '../hooks/useRelay'
import type { NIP11Metadata } from '../types/nostr'
import { useLog } from './LogContext'

export interface NIP11ContextType {
  metadata: NIP11Metadata | null
  loading: boolean
  error: string | null
  fetchMetadata: (relayUrl: string) => Promise<void>
}

export type UseNIP11Return = NIP11ContextType

const NIP11Context = createContext<NIP11ContextType | undefined>(undefined)

async function fetchNIP11Metadata(relayUrl: string): Promise<NIP11Metadata> {
  if (!relayUrl.trim()) throw new Error('Relay URL is required')
  let baseUrl = relayUrl.trim()
  if (baseUrl.startsWith('ws://')) baseUrl = baseUrl.replace('ws://', 'http://')
  else if (baseUrl.startsWith('wss://')) baseUrl = baseUrl.replace('wss://', 'https://')
  else if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) baseUrl = `https://${baseUrl}`
  baseUrl = baseUrl.replace(/\/$/, '')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  const fetchOpts = { signal: controller.signal, headers: { Accept: 'application/nostr+json' } }

  try {
    let response = await fetch(baseUrl + '/', fetchOpts)
    if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    if (!response.ok) {
      response = await fetch(baseUrl + '/.well-known/nostr.json', fetchOpts)
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return response.json() as Promise<NIP11Metadata>
  } finally {
    clearTimeout(timeout)
  }
}

export function NIP11Provider({ children }: { children: React.ReactNode }) {
  const { url: relayUrl } = useRelay()
  const { addLog } = useLog()
  const [metadata, setMetadata] = useState<NIP11Metadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMetadata = useCallback(async (relayUrlParam: string) => {
    if (!relayUrlParam.trim()) {
      const msg = 'Relay URL is required'
      setError(msg)
      addLog('error', msg, 'NIP-11')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchNIP11Metadata(relayUrlParam)
      setMetadata(data)
    } catch (err) {
      setMetadata(null)
      const message =
        err instanceof Error
          ? err.name === 'AbortError'
            ? 'Timeout fetching metadata'
            : err.message
          : 'Error fetching metadata'
      setError(message)
      addLog('error', message, 'NIP-11')
    } finally {
      setLoading(false)
    }
  }, [addLog])

  useEffect(() => {
    if (relayUrl === null) {
      setMetadata(null)
      setError(null)
    }
  }, [relayUrl])

  return (
    <NIP11Context.Provider value={{ metadata, loading, error, fetchMetadata }}>
      {children}
    </NIP11Context.Provider>
  )
}

export function useNIP11Context(): NIP11ContextType {
  const ctx = useContext(NIP11Context)
  if (ctx === undefined) throw new Error('useNIP11Context must be used within NIP11Provider')
  return ctx
}
