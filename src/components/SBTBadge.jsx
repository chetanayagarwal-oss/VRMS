import { motion } from "framer-motion";

function ShieldIcon({ className = "h-3.5 w-3.5 shrink-0" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const TIER_STYLES = {
  Bronze: {
    border: "bg-gradient-to-r from-amber-500 to-orange-500",
    text: "text-amber-400",
    glow: "shadow-amber-500/20",
  },
  bronze: {
    border: "bg-gradient-to-r from-amber-500 to-orange-500",
    text: "text-amber-400",
    glow: "shadow-amber-500/20",
  },
  Silver: {
    border: "bg-gradient-to-r from-zinc-300 to-zinc-500",
    text: "text-zinc-300",
    glow: "shadow-zinc-400/20",
  },
  silver: {
    border: "bg-gradient-to-r from-zinc-300 to-zinc-500",
    text: "text-zinc-300",
    glow: "shadow-zinc-400/20",
  },
  Gold: {
    border: "bg-gradient-to-r from-yellow-400 to-amber-500",
    text: "text-yellow-400",
    glow: "shadow-yellow-400/20",
  },
  gold: {
    border: "bg-gradient-to-r from-yellow-400 to-amber-500",
    text: "text-yellow-400",
    glow: "shadow-yellow-400/20",
  },
  Platinum: {
    border: "bg-gradient-to-r from-cyan-400 to-violet-500",
    text: "text-cyan-300",
    glow: "shadow-cyan-400/20",
  },
  platinum: {
    border: "bg-gradient-to-r from-cyan-400 to-violet-500",
    text: "text-cyan-300",
    glow: "shadow-cyan-400/20",
  },
};

export default function SBTBadge({ count, tier, shine = false, size = "sm" }) {
  const styles = TIER_STYLES[tier] || TIER_STYLES.Bronze;

  const isLarge = size === "lg";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center overflow-hidden rounded-full p-[1px] ${styles.border} ${
        shine ? `shadow-lg ${styles.glow}` : ""
      }`}
      title="Soulbound Token: non-transferable on-chain reputation"
    >
      <span
        className={`relative z-10 flex items-center gap-1.5 rounded-full bg-ink-900 ${
          isLarge ? "px-3.5 py-1.5 text-sm font-semibold" : "px-2.5 py-1 text-xs font-medium"
        } whitespace-nowrap ${styles.text}`}
      >
        <ShieldIcon className={isLarge ? "h-4 w-4 shrink-0" : "h-3.5 w-3.5 shrink-0"} />
        <span>
          {count ? `${count} SBT · ` : ""}
          {tier}
        </span>
      </span>

      {/* Shine sweep animation */}
      {shine && (
        <motion.div
          initial={{ x: "-120%" }}
          animate={{ x: "220%" }}
          transition={{
            repeat: Infinity,
            duration: 2.2,
            ease: "easeInOut",
            repeatDelay: 1.5,
          }}
          className="pointer-events-none absolute inset-0 z-20 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent"
        />
      )}
    </span>
  );
}

