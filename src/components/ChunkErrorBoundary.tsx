/**
 * Error Boundary for Lazy-Loaded Code Chunks
 *
 * Handles network failures when fetching lazy chunks (pages, vendor libraries).
 * Provides user-friendly error messaging and recovery options.
 *
 * Use: Wrap <Suspense> boundaries with this component to catch chunk load failures.
 *
 * Scenarios Handled:
 * 1. Network failure (user offline or CDN down)
 * 2. Stale chunk reference (cache mismatch after deploy)
 * 3. Browser doesn't support dynamic imports
 */

import { ReactNode, Component, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ChunkErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ChunkErrorBoundary extends Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  constructor(props: ChunkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chunk loading failed:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-health-bg">
          <div className="text-center max-w-md px-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-[16px] font-semibold text-health-text mb-2">
              Failed to Load Page
            </h2>
            <p className="text-health-secondary text-[13px] mb-6">
              There was a network error loading this page. This usually means you're offline or the
              server is unreachable.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[13px] font-medium hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
