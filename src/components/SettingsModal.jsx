import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SettingsModal({ isOpen, onClose, budget, onSave }) {
  const [min, setMin] = useState(budget.min);
  const [max, setMax] = useState(budget.max);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMin(budget.min);
      setMax(budget.max);
      setError("");
    }
  }, [isOpen, budget]);

  const handleSave = (e) => {
    e.preventDefault();
    const minVal = Number(min);
    const maxVal = Number(max);

    if (isNaN(minVal) || isNaN(maxVal)) {
      setError("Please enter valid numeric values.");
      return;
    }
    if (minVal < 0) {
      setError("Minimum budget cannot be negative.");
      return;
    }
    if (minVal > maxVal) {
      setError("Minimum budget cannot exceed maximum target budget.");
      return;
    }

    setError("");
    onSave({ min: minVal, max: maxVal });
    onClose();
  };

  const handleReset = () => {
    setMin(1000);
    setMax(3000);
    setError("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-ink-900/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent-soft">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Agent Negotiation Settings</h3>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Hidden thresholds configured for your autonomous Seller AI agent.
                </p>
              </div>

              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            {/* Confidentiality Pill */}
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-xs text-violet-300">
              <span className="text-base">🔒</span>
              <span>
                <strong>Zero-Knowledge Budget:</strong> These numbers are never shown on your profile
                or cards. Only your local AI agent knows them.
              </span>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Hidden Minimum Floor (USDC)
                </label>
                <div className="mt-1.5 relative rounded-xl border border-white/10 bg-ink-950 focus-within:border-accent">
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    className="w-full bg-transparent px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:outline-none"
                    placeholder="1000"
                  />
                  <span className="absolute right-3.5 top-2.5 font-mono text-xs text-zinc-500">
                    USDC
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Your AI will strictly decline any deal below this amount.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Hidden Maximum Target (USDC)
                </label>
                <div className="mt-1.5 relative rounded-xl border border-white/10 bg-ink-950 focus-within:border-accent">
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                    className="w-full bg-transparent px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:outline-none"
                    placeholder="3000"
                  />
                  <span className="absolute right-3.5 top-2.5 font-mono text-xs text-zinc-500">
                    USDC
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Your AI will open negotiations anchoring near this upper target.
                </p>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-medium text-zinc-500">Quick Presets:</span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMin(800);
                      setMax(2000);
                    }}
                    className="rounded-lg border border-white/5 bg-ink-800 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-accent/40 hover:bg-ink-700"
                  >
                    $800 - $2,000
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMin(1000);
                      setMax(3000);
                    }}
                    className="rounded-lg border border-white/5 bg-ink-800 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-accent/40 hover:bg-ink-700"
                  >
                    $1,000 - $3,000 (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMin(2000);
                      setMax(4500);
                    }}
                    className="rounded-lg border border-white/5 bg-ink-800 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-accent/40 hover:bg-ink-700"
                  >
                    $2,000 - $4,500
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400">
                  ⚠️ {error}
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-zinc-400 underline-offset-4 hover:text-white hover:underline"
                >
                  Reset defaults
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-accent px-5 py-2 text-xs font-semibold text-white transition hover:bg-accent-soft shadow-lg shadow-accent/20"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
