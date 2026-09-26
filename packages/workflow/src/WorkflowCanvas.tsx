import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Background, Controls, Handle, Position, ReactFlow } from '@xyflow/react'
import type { Connection, NodeChange, NodeProps } from '@xyflow/react'
import { cn } from '@wasichai/ui'
import { stateTone, toFlow } from './workflowGraph'
import type { XY } from './workflowGraph'
import type { WorkflowDefinition, WorkflowState } from './types'
import '@xyflow/react/dist/style.css'

interface Props {
  definition: WorkflowDefinition
  positions: Record<string, XY>
  selected: string | null
  onSelectState: (name: string) => void
  onSelectTransition: (name: string) => void
  onMove: (name: string, at: XY) => void
  onConnect: (from: string, to: string) => void
}

// the canvas owns nothing. it draws what it is handed and reports what the pointer did.
export function WorkflowCanvas({ definition, positions, selected, onSelectState, onSelectTransition, onMove, onConnect }: Props) {
  const { nodes, edges } = useMemo(() => toFlow(definition, positions), [definition, positions])
  // the instance is typed to our node shape; keeping just the one call we need avoids dragging
  // that generic through the component.
  const refit = useRef<(() => void) | null>(null)

  // a new state is placed beside the rightmost one, which is off screen as often as not.
  // adding something you cannot see reads as a button that did nothing, so widen the view.
  useEffect(() => {
    refit.current?.()
  }, [nodes.length])

  const handleNodesChange = (changes: NodeChange[]) =>
    changes.forEach((change) => {
      // dragging fires a stream of these; only the final position is worth keeping
      if (change.type === 'position' && change.position && change.dragging === false) {
        onMove(change.id, change.position)
      }
    })

  return (
    <ReactFlow
      nodes={nodes.map((node) => ({ ...node, selected: node.id === selected }))}
      edges={edges.map((edge) => ({ ...edge, selected: edge.id === selected }))}
      nodeTypes={NODE_TYPES}
      onInit={(instance) => {
        refit.current = () => void instance.fitView({ duration: 200 })
      }}
      onNodesChange={handleNodesChange}
      onNodeClick={(_event, node) => onSelectState(node.id)}
      onEdgeClick={(_event, edge) => onSelectTransition(edge.id)}
      onConnect={(connection: Connection) => {
        if (connection.source && connection.target) onConnect(connection.source, connection.target)
      }}
      fitView
    >
      <Background />
      <Controls showInteractive={false} />
      {/* no minimap: these graphs fit on screen, so it would only hide the corner it sits on */}
    </ReactFlow>
  )
}

// a state box: label, type, and a handle on each side so an edge can be dragged out
function StateNode({ data, selected }: NodeProps) {
  const { t } = useTranslation(['workflow', 'common'])
  const state = (data as { state: WorkflowState }).state
  return (
    <div
      className={cn(
        'min-w-40 rounded-card border px-4 py-2.5 text-center shadow-sm',
        stateTone(state.type),
        selected ? 'border-brand ring-2 ring-brand/40' : 'border-border'
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-none !bg-ink-muted" />
      <p className="text-sm font-medium">{state.label || state.name}</p>
      <p className="text-xs opacity-70">{t(`workflows.types.${state.type}`)}</p>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-none !bg-ink-muted" />
    </div>
  )
}

// react flow reads this by identity, so it must not be rebuilt on every render
const NODE_TYPES = { state: StateNode }
