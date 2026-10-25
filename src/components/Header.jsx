export default function Header({
  matched = 0,
  skipped = 0,
  completedCount = 0,
  currentView = "feed",
  onOpenSettings,
  onToggleProfile,
}) {
  return (
    <header className="mx-auto flex w-full max-w-[420px] items-center justify-between px-2 pt-6 sm:pt-8">
      {/* Brand logo & title */}
      <button
        onClick={() => onToggleProfile("feed")}
        className="flex items-center gap-2.5 text-left transition hover:opacity-85"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-black text-white shadow-md shadow-accent/20">
          S
        </div>
        <span className="text-lg font-bold tracking-tight text-white">
          Swipe<span className="text-accent-soft">Gig</span>
        </span>
      </button>

      {/* Center/Right Nav Controls */}
      <div className="flex items-center gap-2">
        {/* Saved pills (only on feed view) */}
        {currentView === "feed" && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-400">
              {matched} saved
            </span>
          </div>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title="Agent Negotiation Settings"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-ink-900/80 text-zinc-400 transition hover:border-white/20 hover:bg-ink-800 hover:text-white"
          aria-label="Open settings"
        >
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
        </button>

        {/* Profile View Toggle Button */}
        <button
          onClick={() => onToggleProfile(currentView === "profile" ? "feed" : "profile")}
          title="User Profile & Soulbound Tokens"
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
            currentView === "profile"
              ? "border-accent bg-accent text-white"
              : "border-white/10 bg-ink-900/80 text-zinc-300 hover:border-white/20 hover:bg-ink-800"
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
            👤
          </span>
          <span>{currentView === "profile" ? "Feed" : "Profile"}</span>
          {completedCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
              {completedCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
