import { apiRequest } from './client'
import type { ChatMessage, Citation } from '../data/mockData'

export interface ApiCitation {
  chunk_id: string
  document_id: string
  document_name: string
  page_number: number
  snippet: string
  score: number
}

export interface ApiChatMessage {
  id: string
  role: string
  content: string
  citations?: ApiCitation[] | null
  created_at: string
}

export interface ChatRequestPayload {
  message: string
  document_ids?: string[]
  session_id?: string
}

export interface ChatResponsePayload {
  session_id: string
  user_message: ApiChatMessage
  assistant_message: ApiChatMessage
}

export function mapCitation(citation: ApiCitation, index: number): Citation {
  return {
    id: `${citation.chunk_id}-${index}`,
    pageNumber: citation.page_number,
    snippet: citation.snippet,
    documentTitle: citation.document_name,
  }
}

export function mapChatMessage(message: ApiChatMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role as ChatMessage['role'],
    content: message.content,
    citations: message.citations?.map(mapCitation),
  }
}

export async function sendChatMessage(payload: ChatRequestPayload): Promise<ChatResponsePayload> {
  return apiRequest<ChatResponsePayload>('/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
