export default function Header({ matched, skipped }) {
  return (
    <header className="mx-auto flex w-full max-w-[400px] items-center justify-between px-1 pt-6 sm:pt-8">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-black text-white">
          S
        </div>
        <span className="text-lg font-bold tracking-tight">
          Swipe<span className="text-accent-soft">Gig</span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs font-medium">
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-400">
          {matched} saved
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-400">
          {skipped} skipped
        </span>
      </div>
    </header>
  );
}
