import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("SwipeGig Error Boundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-ink-950 px-4 py-8 text-white">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-ink-900/90 p-7 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-3xl text-rose-400">
              ⚡
            </div>

            <h1 className="mt-4 text-xl font-bold text-white">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              An unexpected interface error occurred. Don't worry, your wallet state and budget parameters are safe.
            </p>

            {this.state.error && (
              <div className="mt-4 max-h-32 overflow-auto rounded-xl border border-white/5 bg-ink-950 p-3 text-left font-mono text-xs text-rose-300">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleResetState}
                className="min-h-[44px] rounded-full border border-white/10 bg-ink-800 px-5 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-ink-700 hover:text-white"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="min-h-[44px] rounded-full bg-accent px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-soft"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
