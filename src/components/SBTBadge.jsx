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
  },
  bronze: {
    border: "bg-gradient-to-r from-amber-500 to-orange-500",
    text: "text-amber-400",
  },
  Silver: {
    border: "bg-gradient-to-r from-zinc-300 to-zinc-500",
    text: "text-zinc-300",
  },
  silver: {
    border: "bg-gradient-to-r from-zinc-300 to-zinc-500",
    text: "text-zinc-300",
  },
  Gold: {
    border: "bg-gradient-to-r from-yellow-400 to-amber-500",
    text: "text-yellow-400",
  },
  gold: {
    border: "bg-gradient-to-r from-yellow-400 to-amber-500",
    text: "text-yellow-400",
  },
  Platinum: {
    border: "bg-gradient-to-r from-cyan-400 to-violet-500",
    text: "text-cyan-300",
  },
  platinum: {
    border: "bg-gradient-to-r from-cyan-400 to-violet-500",
    text: "text-cyan-300",
  },
};

export default function SBTBadge({ count, tier }) {
  const styles = TIER_STYLES[tier] || TIER_STYLES.Bronze;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full p-[1px] ${styles.border}`}
      title="Soulbound Token: non-transferable on-chain reputation"
    >
      <span
        className={`flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-xs font-medium whitespace-nowrap ${styles.text}`}
      >
        <ShieldIcon className="h-3.5 w-3.5 shrink-0" />
        <span>
          {count} SBT · {tier}
        </span>
      </span>
    </span>
  );
}
