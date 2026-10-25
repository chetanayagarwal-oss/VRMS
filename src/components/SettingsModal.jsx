import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SettingsModal({ isOpen, onClose, budget, onSave }) {
  const [min, setMin] = useState(budget.min);
  const [max, setMax] = useState(budget.max);
  const [minError, setMinError] = useState("");
  const [maxError, setMaxError] = useState("");
  const [generalError, setGeneralError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMin(budget.min);
      setMax(budget.max);
      setMinError("");
      setMaxError("");
      setGeneralError("");
    }
  }, [isOpen, budget]);

  const validate = (minVal, maxVal) => {
    let hasErr = false;
    setMinError("");
    setMaxError("");
    setGeneralError("");

    if (isNaN(minVal) || minVal === "") {
      setMinError("Please enter a valid numeric value.");
      hasErr = true;
    } else if (minVal <= 0) {
      setMinError("Minimum budget must be greater than 0 USDC.");
      hasErr = true;
    }

    if (isNaN(maxVal) || maxVal === "") {
      setMaxError("Please enter a valid numeric value.");
      hasErr = true;
    } else if (maxVal <= 0) {
      setMaxError("Maximum target must be greater than 0 USDC.");
      hasErr = true;
    } else if (maxVal > 1_000_000) {
      setMaxError("Maximum budget cannot exceed 1,000,000 USDC.");
      hasErr = true;
    }

    if (!hasErr && minVal > maxVal) {
      setGeneralError("Minimum floor cannot exceed maximum target budget.");
      hasErr = true;
    }

    return !hasErr;
  };

  const handleMinChange = (val) => {
    setMin(val);
    const nMin = Number(val);
    const nMax = Number(max);
    if (!isNaN(nMin) && !isNaN(nMax) && nMin > nMax && nMin > 0 && nMax > 0) {
      setGeneralError("Minimum floor cannot exceed maximum target budget.");
    } else {
      setGeneralError("");
    }
    if (nMin <= 0 && val !== "") {
      setMinError("Minimum budget must be greater than 0 USDC.");
    } else {
      setMinError("");
    }
  };

  const handleMaxChange = (val) => {
    setMax(val);
    const nMin = Number(min);
    const nMax = Number(val);
    if (!isNaN(nMin) && !isNaN(nMax) && nMin > nMax && nMin > 0 && nMax > 0) {
      setGeneralError("Minimum floor cannot exceed maximum target budget.");
    } else {
      setGeneralError("");
    }
    if (nMax <= 0 && val !== "") {
      setMaxError("Maximum target must be greater than 0 USDC.");
    } else if (nMax > 1_000_000) {
      setMaxError("Maximum budget cannot exceed 1,000,000 USDC.");
    } else {
      setMaxError("");
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const minVal = Number(min);
    const maxVal = Number(max);

    if (!validate(minVal, maxVal)) {
      return;
    }

    onSave({ min: minVal, max: maxVal });
    onClose();
  };

  const handleReset = () => {
    setMin(1000);
    setMax(3000);
    setMinError("");
    setMaxError("");
    setGeneralError("");
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
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white"
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
                <div
                  className={`mt-1.5 relative rounded-xl border bg-ink-950 focus-within:border-accent ${
                    minError ? "border-rose-500/50" : "border-white/10"
                  }`}
                >
                  <input
                    type="number"
                    step="50"
                    min="1"
                    value={min}
                    onChange={(e) => handleMinChange(e.target.value)}
                    className="w-full bg-transparent px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:outline-none"
                    placeholder="1000"
                  />
                  <span className="absolute right-3.5 top-2.5 font-mono text-xs text-zinc-500">
                    USDC
                  </span>
                </div>
                {minError ? (
                  <p className="mt-1 text-[11px] font-medium text-rose-400">{minError}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Your AI will strictly decline any deal below this amount.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Hidden Maximum Target (USDC)
                </label>
                <div
                  className={`mt-1.5 relative rounded-xl border bg-ink-950 focus-within:border-accent ${
                    maxError ? "border-rose-500/50" : "border-white/10"
                  }`}
                >
                  <input
                    type="number"
                    step="50"
                    min="1"
                    value={max}
                    onChange={(e) => handleMaxChange(e.target.value)}
                    className="w-full bg-transparent px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:outline-none"
                    placeholder="3000"
                  />
                  <span className="absolute right-3.5 top-2.5 font-mono text-xs text-zinc-500">
                    USDC
                  </span>
                </div>
                {maxError ? (
                  <p className="mt-1 text-[11px] font-medium text-rose-400">{maxError}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Your AI will open negotiations anchoring near this upper target.
                  </p>
                )}
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
                      setMinError("");
                      setMaxError("");
                      setGeneralError("");
                    }}
                    className="min-h-[44px] rounded-lg border border-white/5 bg-ink-800 px-3 py-2 text-xs text-zinc-300 transition hover:border-accent/40 hover:bg-ink-700"
                  >
                    $800 - $2,000
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMin(1000);
                      setMax(3000);
                      setMinError("");
                      setMaxError("");
                      setGeneralError("");
                    }}
                    className="min-h-[44px] rounded-lg border border-white/5 bg-ink-800 px-3 py-2 text-xs text-zinc-300 transition hover:border-accent/40 hover:bg-ink-700"
                  >
                    $1,000 - $3,000 (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMin(2000);
                      setMax(4500);
                      setMinError("");
                      setMaxError("");
                      setGeneralError("");
                    }}
                    className="min-h-[44px] rounded-lg border border-white/5 bg-ink-800 px-3 py-2 text-xs text-zinc-300 transition hover:border-accent/40 hover:bg-ink-700"
                  >
                    $2,000 - $4,500
                  </button>
                </div>
              </div>

              {generalError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-400">
                  ⚠️ {generalError}
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-[44px] text-xs text-zinc-400 underline-offset-4 hover:text-white hover:underline"
                >
                  Reset defaults
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] rounded-full bg-accent px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-soft"
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
