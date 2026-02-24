import type { Event } from 'nostr-tools'

export interface RelayConnection {
  url: string
  ws: WebSocket | null
  isConnected: boolean
  error: string | null
}

const CONNECTION_TIMEOUT = 10000

export function createRelayConnection(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    let resolved = false

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        ws.close()
        reject(new Error('Connection timeout after 10 seconds'))
      }
    }, CONNECTION_TIMEOUT)

    ws.onopen = () => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        resolve(ws)
      }
    }

    ws.onerror = () => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        reject(new Error('WebSocket error while connecting'))
      }
    }

    ws.onclose = () => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        reject(new Error('Connection closed'))
      }
    }
  })
}

export function sendEvent(ws: WebSocket, event: Event): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket is not connected'))
      return
    }

    const message = JSON.stringify(['EVENT', event])
    ws.send(message)

    const timeout = setTimeout(() => {
      ws.removeEventListener('message', messageHandler)
      reject(new Error('Timeout sending event'))
    }, 5000)

    const messageHandler = (msg: MessageEvent) => {
      try {
        const data = JSON.parse(msg.data as string)
        if (Array.isArray(data) && data.length >= 2) {
          if (data[0] === 'OK' && data[1] === event.id) {
            clearTimeout(timeout)
            ws.removeEventListener('message', messageHandler)
            if (data[2] === true) {
              resolve()
            } else {
              reject(new Error(data[3] || 'Event was rejected by relay'))
            }
          }
        }
      } catch (err) {
        // Ignore non-JSON messages
      }
    }

    ws.addEventListener('message', messageHandler)
  })
}

const PING_REQ_TIMEOUT = 5000

export function measureRoundTrip(ws: WebSocket): Promise<number | null> {
  return new Promise((resolve) => {
    if (ws.readyState !== WebSocket.OPEN) {
      resolve(null)
      return
    }
    const subId = `ping-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const start = performance.now()
    ws.send(JSON.stringify(['REQ', subId, { kinds: [1], limit: 1 }]))
    const timeout = setTimeout(() => {
      ws.removeEventListener('message', messageHandler)
      resolve(null)
    }, PING_REQ_TIMEOUT)
    const messageHandler = (msg: MessageEvent) => {
      try {
        const data = JSON.parse(msg.data as string)
        if (!Array.isArray(data) || data.length < 2) return
        if (data[0] === 'EOSE' && data[1] === subId) {
          clearTimeout(timeout)
          ws.removeEventListener('message', messageHandler)
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(['CLOSE', subId]))
          }
          resolve(Math.round(performance.now() - start))
        }
      } catch {
        // ignore
      }
    }
    ws.addEventListener('message', messageHandler)
  })
}

const COUNT_TIMEOUT = 5000

export function requestCount(
  ws: WebSocket,
  filter: { kinds?: number[]; since?: number; until?: number }
): Promise<number | null> {
  return new Promise((resolve) => {
    if (ws.readyState !== WebSocket.OPEN) {
      resolve(null)
      return
    }
    const subId = `count-${Date.now()}-${Math.random().toString(36).slice(2)}`
    ws.send(JSON.stringify(['REQ', subId, filter]))
    const timeout = setTimeout(() => {
      ws.removeEventListener('message', messageHandler)
      resolve(null)
    }, COUNT_TIMEOUT)
    const messageHandler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (!Array.isArray(data) || data.length < 3) return
        if (data[0] === 'COUNT' && data[1] === subId) {
          clearTimeout(timeout)
          ws.removeEventListener('message', messageHandler)
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(['CLOSE', subId]))
          }
          const payload = data[2]
          const count =
            typeof payload === 'number'
              ? payload
              : typeof payload?.count === 'number'
                ? payload.count
                : null
          resolve(count)
        }
      } catch {
        // ignore
      }
    }
    ws.addEventListener('message', messageHandler)
  })
}

export function subscribeToRecentEvents(
  ws: WebSocket,
  filter: { kinds: number[]; limit?: number; since?: number },
  onEvent: (event: Event) => void
): () => void {
  if (ws.readyState !== WebSocket.OPEN) return () => {}
  const subId = `recent-${Date.now()}`
  const limit = filter.limit ?? 10
  ws.send(JSON.stringify(['REQ', subId, { ...filter, limit }]))
  const messageHandler = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)
      if (Array.isArray(data) && data[0] === 'EVENT' && data[1] === subId && data[2]) {
        onEvent(data[2] as Event)
      }
    } catch {
      // ignore
    }
  }
  ws.addEventListener('message', messageHandler)
  return () => {
    ws.removeEventListener('message', messageHandler)
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(['CLOSE', subId]))
    }
  }
}

export function subscribeToConnections(
  ws: WebSocket,
  _onUpdate: (connections: any[]) => void
): () => void {
  const subId = `connections-${Date.now()}`
  const message = JSON.stringify(['REQ', subId, { kinds: [25001] }])
  
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message)
  }

  const messageHandler = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)
      if (Array.isArray(data) && data[0] === 'EVENT' && data[1] === subId) {
        // Handle connection events if relay supports it
        // This is relay-specific and may need adjustment
      }
    } catch (err) {
      // Ignore parsing errors
    }
  }

  ws.addEventListener('message', messageHandler)

  return () => {
    ws.removeEventListener('message', messageHandler)
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(['CLOSE', subId]))
    }
  }
}
