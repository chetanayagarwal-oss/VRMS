import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  {
    icon: "??",
    title: "Pick Your Role",
    color: "from-violet-500 to-indigo-500",
    badge: "Step 1",
    content: "On first launch you chose either Client or Freelancer. This shapes which gigs you see and how your AI agent behaves. You can change your role anytime from Settings.",
  },
  {
    icon: "??",
    title: "Swipe the Feed",
    color: "from-cyan-500 to-teal-500",
    badge: "Step 2",
    content: "Cards represent gigs or talent. Swipe RIGHT (or tap ?) to express interest. Swipe LEFT (or tap ?) to skip. Use the skill tags at the top to filter by category.",
  },
  {
    icon: "??",
    title: "AI Negotiation",
    color: "from-amber-500 to-orange-500",
    badge: "Step 3",
    content: "When you swipe right, your personal AI Agent auto-negotiates price & terms in the background using your hidden budget range (set in Settings). You never have to message anyone.",
  },
  {
    icon: "?",
    title: "Smart Contract Escrow",
    color: "from-emerald-500 to-green-500",
    badge: "Step 4",
    content: "Once a deal is struck, funds are locked in a Web3 smart contract. The worker only gets paid when the job is marked complete — protecting both sides automatically.",
  },
  {
    icon: "??",
    title: "Earn Reputation SBTs",
    color: "from-rose-500 to-pink-500",
    badge: "Step 5",
    content: "After each completed job, the worker is minted a Soulbound Token (SBT) — an on-chain, non-transferable proof of reputation that lives in their wallet forever.",
  },
  {
    icon: "??",
    title: "Configure Your Agent",
    color: "from-slate-400 to-zinc-500",
    badge: "Tip",
    content: "Go to Settings (gear icon in header) to set your hidden budget range. Your AI uses these numbers to negotiate without ever revealing them to the other party.",
  },
];

export default function StarterManual({ onClose }) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-ink-950/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">??</span>
          <div>
            <h4 className="text-sm font-bold text-white">Starter Manual</h4>
            <p className="text-[10px] text-zinc-500">How SwipeGig works in 6 steps</p>
          </div>
        </div>
        <div className="text-[10px] font-medium text-zinc-600">
          {activeStep + 1} / {steps.length}
        </div>
      </div>

      {/* Step Dots */}
      <div className="flex justify-center gap-1.5 px-5 pt-4">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveStep(i)}
            className={`h-1.5 rounded-full transition-all duration-200 ${i === activeStep ? "w-6 bg-accent" : "w-1.5 bg-white/20 hover:bg-white/40"}`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="px-5 py-4 min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col gap-3"
          >
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${steps[activeStep].color} text-2xl shadow-lg`}>
              {steps[activeStep].icon}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {steps[activeStep].badge}
              </span>
              <h5 className="mt-0.5 text-base font-bold text-white">{steps[activeStep].title}</h5>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                {steps[activeStep].content}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
        <button
          onClick={() => setActiveStep((p) => Math.max(0, p - 1))}
          disabled={activeStep === 0}
          className="min-h-[36px] rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          ? Prev
        </button>
        {activeStep < steps.length - 1 ? (
          <button
            onClick={() => setActiveStep((p) => Math.min(steps.length - 1, p + 1))}
            className="min-h-[36px] rounded-full bg-accent px-5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-soft"
          >
            Next ?
          </button>
        ) : (
          <button
            onClick={onClose}
            className="min-h-[36px] rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            ?? Let's Go!
          </button>
        )}
      </div>
    </div>
  );
}
