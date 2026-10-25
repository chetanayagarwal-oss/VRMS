// src/utils/analytics.js
// Lightweight analytics tracker for SwipeGig.
// Strictly a no-op unless VITE_ANALYTICS_ENABLED is true.

export function track(event, props = {}) {
  const isEnabled = import.meta.env.VITE_ANALYTICS_ENABLED === "true";
  if (!isEnabled) {
    return;
  }

  try {
    const payload = {
      event,
      properties: props,
      timestamp: new Date().toISOString(),
    };

    if (import.meta.env.DEV) {
      console.log(`[Analytics] ${event}`, payload);
    }

    // Dispatch custom browser event for observability
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("swipegig_analytics", { detail: payload })
      );
    }
  } catch {
    // Non-blocking: analytics should never interfere with user flow
  }
}

export function useAnalytics() {
  return { track };
}
