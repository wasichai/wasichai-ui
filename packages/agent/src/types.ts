// one tool call the agent made on its way to the answer
export interface AgentStep {
  tool: string
  input: Record<string, unknown>
  summary: string
}

export interface AgentAnswer {
  answer: string
  steps: AgentStep[]
  // agent hit its step limit and stopped. the answer may be half a story.
  truncated: boolean
}

export interface AgentStatus {
  enabled: boolean
  model: string
}
