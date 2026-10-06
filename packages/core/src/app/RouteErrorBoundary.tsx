import { Component, type ReactNode } from 'react'
import { ErrorState } from '../components/query-state/QueryState'

interface RouteErrorBoundaryProps {
  children: ReactNode
  // the error is forgotten when this changes: following a link is the way out of a broken page
  resetKey: string
}

interface RouteErrorBoundaryState {
  // a thrown undefined is still a failure, so this says it, not error
  failed: boolean
  error: unknown
  key: string
}

// a page that throws while drawing, or whose lazy chunk is gone after a deploy, took the whole root
// down: a white page, sidebar and all. React.lazy keeps a failed import, so retry reloads the app.
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props)
    this.state = { failed: false, error: null, key: props.resetKey }
  }

  static getDerivedStateFromError(error: unknown): Partial<RouteErrorBoundaryState> {
    return { failed: true, error }
  }

  static getDerivedStateFromProps(props: RouteErrorBoundaryProps, state: RouteErrorBoundaryState): Partial<RouteErrorBoundaryState> | null {
    return props.resetKey === state.key ? null : { failed: false, error: null, key: props.resetKey }
  }

  render() {
    return this.state.failed ? <ErrorState error={this.state.error} onRetry={() => window.location.reload()} /> : this.props.children
  }
}
