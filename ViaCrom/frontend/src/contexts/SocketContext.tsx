import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Report } from '../types'

const SOCKET_URL = 'http://localhost:3000'

interface SocketState {
  connected: boolean
  reports: Report[]
  onlineUsers: number
}

interface SocketContext extends SocketState {
  joinRegion: (region: string) => void
  leaveRegion: (region: string) => void
  joinTrip: (tripId: string) => void
  leaveTrip: (tripId: string) => void
  on: (event: string, handler: (...args: any[]) => void) => void
  off: (event: string, handler: (...args: any[]) => void) => void
}

const SocketCtx = createContext<SocketContext>({
  connected: false,
  reports: [],
  onlineUsers: 0,
  joinRegion: () => {},
  leaveRegion: () => {},
  joinTrip: () => {},
  leaveTrip: () => {},
  on: () => {},
  off: () => {},
})

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [onlineUsers, setOnlineUsers] = useState(0)
  const handlersRef = useRef<Map<string, Set<(...args: any[]) => void>>>(new Map())

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 20,
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('new-report', (report: Report) => {
      setReports(prev => {
        if (prev.some(r => r.id === report.id)) return prev
        return [report, ...prev]
      })
      emitToHandlers('new-report', report)
    })

    socket.on('report-updated', (report: Report) => {
      setReports(prev => prev.map(r => r.id === report.id ? report : r))
      emitToHandlers('report-updated', report)
    })

    socket.on('report-expired', (report: Report) => {
      setReports(prev => prev.filter(r => r.id !== report.id))
      emitToHandlers('report-expired', report)
    })

    socket.on('report-deleted', (data: { report_id: string }) => {
      setReports(prev => prev.filter(r => r.id !== data.report_id))
      emitToHandlers('report-deleted', data)
    })

    socket.on('proximity-warning', (data: any) => {
      emitToHandlers('proximity-warning', data)
    })

    socket.on('eta-update', (data: any) => {
      emitToHandlers('eta-update', data)
    })

    socket.on('users-count', (count: number) => {
      setOnlineUsers(count)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  function emitToHandlers(event: string, ...args: any[]) {
    const handlers = handlersRef.current.get(event)
    if (handlers) {
      handlers.forEach(fn => fn(...args))
    }
  }

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set())
    }
    handlersRef.current.get(event)!.add(handler)
  }, [])

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    handlersRef.current.get(event)?.delete(handler)
  }, [])

  const joinRegion = useCallback((region: string) => {
    socketRef.current?.emit('join-region', region)
  }, [])

  const leaveRegion = useCallback((region: string) => {
    socketRef.current?.emit('leave-region', region)
  }, [])

  const joinTrip = useCallback((tripId: string) => {
    socketRef.current?.emit('join-trip', tripId)
  }, [])

  const leaveTrip = useCallback((tripId: string) => {
    socketRef.current?.emit('leave-trip', tripId)
  }, [])

  return (
    <SocketCtx.Provider value={{
      connected, reports, onlineUsers,
      joinRegion, leaveRegion, joinTrip, leaveTrip, on, off,
    }}>
      {children}
    </SocketCtx.Provider>
  )
}

export const useSocket = () => useContext(SocketCtx)
