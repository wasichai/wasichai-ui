import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@wasichai/core'
import type { AgentAnswer, AgentConversation, AgentConversationDetail, AgentExchange, AgentSettings, AgentStatus } from './types'

const STATUS = ['agent', 'status'] as const
const CONVERSATIONS = ['agent', 'conversations'] as const
const SETTINGS = ['agent', 'settings'] as const

// no model key configured, or the endpoint does not exist yet. do not retry, just report it.
export function useAgentStatus() {
  return useQuery({
    queryKey: STATUS,
    queryFn: () => api<AgentStatus>('/agent/status'),
    retry: false
  })
}

// the agent runs as the signed-in user, so the bearer token in api() is the whole security model.
export function useAskAgent() {
  return useMutation({
    mutationFn: (question: string) => api<AgentAnswer>('/agent/ask', { method: 'POST', body: JSON.stringify({ question }) })
  })
}

// the signed-in user's conversations, newest first. the server keeps them; nobody else sees them.
export function useConversations(enabled = true) {
  return useQuery({
    queryKey: CONVERSATIONS,
    queryFn: () => api<AgentConversation[]>('/agent/conversations'),
    enabled,
    retry: false
  })
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: [...CONVERSATIONS, id],
    queryFn: () => api<AgentConversationDetail>(`/agent/conversations/${id}`),
    enabled: id !== null,
    retry: false
  })
}

export function useCreateConversation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (title?: string) => api<AgentConversation>('/agent/conversations', { method: 'POST', body: JSON.stringify({ title }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: CONVERSATIONS, exact: true })
  })
}

// a question in a conversation: the server asks with the earlier exchanges and keeps both sides
export function useSendMessage() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, question }: { conversationId: string; question: string }) =>
      api<AgentExchange>(`/agent/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ question }) }),
    onSuccess: (_exchange, { conversationId }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: [...CONVERSATIONS, conversationId] }),
        client.invalidateQueries({ queryKey: CONVERSATIONS, exact: true })
      ])
  })
}

export function useRenameConversation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api<AgentConversation>(`/agent/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: CONVERSATIONS })
  })
}

export function useArchiveConversation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/agent/conversations/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: CONVERSATIONS })
  })
}

export function useAgentSettings(enabled = true) {
  return useQuery({ queryKey: SETTINGS, queryFn: () => api<AgentSettings>('/agent/settings'), enabled, retry: false })
}

// null goes back to the app's default
export function useUpdateAgentSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (model: string | null) => api<AgentSettings>('/agent/settings', { method: 'PUT', body: JSON.stringify({ model }) }),
    onSuccess: (settings) => {
      client.setQueryData(SETTINGS, settings)
      return client.invalidateQueries({ queryKey: STATUS })
    }
  })
}
