import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ChatMessage } from '../data/mockData'

export interface ChatSession {
  id: string
  documentIds: string[]
  documentTitles: string[]
  messages: ChatMessage[]
  createdAt: string
}

interface ChatContextValue {
  sessions: ChatSession[]
  activeSessionId: string | null
  activeSession: ChatSession | null
  createSession: (documentIds: string[], documentTitles: string[]) => ChatSession
  setActiveSession: (sessionId: string) => void
  addMessage: (sessionId: string, message: ChatMessage) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem('lexiai_chat_sessions')
    return raw ? (JSON.parse(raw) as ChatSession[]) : []
  } catch {
    return []
  }
}

function loadActiveSessionId(): string | null {
  return localStorage.getItem('lexiai_active_session')
}

function persistSessions(sessions: ChatSession[]) {
  localStorage.setItem('lexiai_chat_sessions', JSON.stringify(sessions))
}

function persistActiveSessionId(sessionId: string | null) {
  if (sessionId) {
    localStorage.setItem('lexiai_active_session', sessionId)
  } else {
    localStorage.removeItem('lexiai_active_session')
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(loadActiveSessionId)

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  )

  const createSession = useCallback((documentIds: string[], documentTitles: string[]) => {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      documentIds,
      documentTitles,
      messages: [],
      createdAt: new Date().toISOString(),
    }

    setSessions((prev) => {
      const next = [session, ...prev]
      persistSessions(next)
      return next
    })
    setActiveSessionId(session.id)
    persistActiveSessionId(session.id)
    return session
  }, [])

  const setActiveSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId)
    persistActiveSessionId(sessionId)
  }, [])

  const addMessage = useCallback((sessionId: string, message: ChatMessage) => {
    setSessions((prev) => {
      const next = prev.map((session) =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, message] }
          : session,
      )
      persistSessions(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      sessions,
      activeSessionId,
      activeSession,
      createSession,
      setActiveSession,
      addMessage,
    }),
    [sessions, activeSessionId, activeSession, createSession, setActiveSession, addMessage],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
