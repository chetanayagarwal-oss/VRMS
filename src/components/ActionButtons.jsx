import { motion } from "framer-motion";

function RoundButton({ onClick, disabled, label, className, children }) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.08 }}
      whileTap={{ scale: disabled ? 1 : 0.92 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex h-16 w-16 items-center justify-center rounded-full border text-2xl shadow-lg transition-colors disabled:opacity-30 ${className}`}
    >
      {children}
    </motion.button>
  );
}

export default function ActionButtons({ onSkip, onApply, disabled }) {
  return (
    <div className="mt-8 flex items-center justify-center gap-8">
      <RoundButton
        onClick={onSkip}
        disabled={disabled}
        label="Skip gig"
        className="border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
      >
        ✕
      </RoundButton>
      <RoundButton
        onClick={onApply}
        disabled={disabled}
        label="Swipe right on gig"
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
      >
        ♥
      </RoundButton>
    </div>
  );
}
