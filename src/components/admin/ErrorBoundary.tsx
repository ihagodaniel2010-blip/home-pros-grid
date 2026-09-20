import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkLoadError: boolean;
}

const isChunkError = (error: Error | null): boolean => {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const name = error.name || "";
  return (
    name === "ChunkLoadError" ||
    msg.includes("loading chunk") ||
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("css chunk load failed") ||
    msg.includes("failed to load resource")
  );
};

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkLoadError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const chunkError = isChunkError(error);
    return { hasError: true, error, isChunkLoadError: chunkError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);

    if (isChunkError(error)) {
      const lastReload = Number(sessionStorage.getItem("spa_chunk_reload_timestamp") || "0");
      const now = Date.now();
      // If we haven't attempted a reload in the last 15 seconds, reload automatically once
      if (now - lastReload > 15000) {
        console.warn("[ErrorBoundary] ChunkLoadError detected after deploy. Triggering automatic hard reload...");
        sessionStorage.setItem("spa_chunk_reload_timestamp", String(now));
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, isChunkLoadError: false });
  };

  handleRefresh = () => {
    this.setState({ hasError: false, error: null, isChunkLoadError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isChunk = this.state.isChunkLoadError;

      return (
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md shadow-lg text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {isChunk ? "New Version Available" : "Section Failed to Load"}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {isChunk
                ? "A new update for H-A Construction was published. Please refresh the page to load the latest application assets."
                : (this.state.error?.message || "A temporary error occurred while rendering this section.")}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRefresh}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0b2a4a] text-white text-sm font-semibold rounded-xl hover:bg-[#081e35] transition-colors shadow-md"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </button>
              {!isChunk && (
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
