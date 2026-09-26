import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@wasichai/core'
import type { AgentAnswer, AgentStatus } from './types'

// no model key configured, or the endpoint does not exist yet. do not retry, just report it.
export function useAgentStatus() {
  return useQuery({
    queryKey: ['agent', 'status'],
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
