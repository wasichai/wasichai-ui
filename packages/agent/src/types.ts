// one tool call the agent made on its way to the answer
export interface AgentStep {
  tool: string
  input: Record<string, unknown>
  summary: string
}

// what one answer spent, when the provider reported it
export interface AgentUsage {
  model: string
  inputTokens: number
  outputTokens: number
}

export interface AgentAnswer {
  answer: string
  steps: AgentStep[]
  // agent hit its step limit and stopped. the answer may be half a story.
  truncated: boolean
  usage?: AgentUsage
  // the model that answered, when the server kept it
  model?: string | null
}

export interface AgentStatus {
  enabled: boolean
  // the model this user's questions go to
  model: string
  // what the user may pick from, the default first. absent on an older backend
  models?: string[]
}

// a conversation kept by the server for the signed-in user (ADR-087)
export interface AgentConversation {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
}

export type AgentMessageRole = 'USER' | 'ASSISTANT'

export interface AgentMessage {
  id: string
  role: AgentMessageRole
  content: string
  steps: AgentStep[]
  truncated: boolean
  usage: AgentUsage | null
  model: string | null
  createdAt: string
}

export interface AgentConversationDetail {
  conversation: AgentConversation
  messages: AgentMessage[]
}

// both sides of one exchange, as stored
export interface AgentExchange {
  question: AgentMessage
  answer: AgentMessage
}

export interface AgentSettings {
  model: string
  // null: never picked, the default applies
  selected: string | null
  defaultModel: string
  models: string[]
}
