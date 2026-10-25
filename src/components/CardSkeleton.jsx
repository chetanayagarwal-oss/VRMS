export default function CardSkeleton() {
  return (
    <div className="relative mx-auto mt-2 h-[520px] w-full max-w-[400px] overflow-hidden rounded-3xl border border-white/10 bg-ink-900/80 p-6 shadow-2xl backdrop-blur-xl">
      {/* Background ambient glow pulse */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent animate-pulse" />

      {/* Top row: Category tag & Budget pill skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 rounded-full bg-white/10 animate-pulse" />
        <div className="h-7 w-28 rounded-full bg-accent/20 animate-pulse" />
      </div>

      {/* Title skeleton */}
      <div className="mt-8 space-y-2.5">
        <div className="h-6 w-5/6 rounded-lg bg-white/15 animate-pulse" />
        <div className="h-6 w-3/5 rounded-lg bg-white/15 animate-pulse" />
      </div>

      {/* Timeline skeleton */}
      <div className="mt-4 flex items-center gap-2">
        <div className="h-4 w-4 rounded-full bg-white/10 animate-pulse" />
        <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
      </div>

      {/* Description lines skeleton */}
      <div className="mt-6 space-y-2">
        <div className="h-3.5 w-full rounded bg-white/10 animate-pulse" />
        <div className="h-3.5 w-11/12 rounded bg-white/10 animate-pulse" />
        <div className="h-3.5 w-4/5 rounded bg-white/10 animate-pulse" />
      </div>

      {/* Skill tags skeleton */}
      <div className="mt-6 flex flex-wrap gap-2">
        <div className="h-6 w-16 rounded-full bg-white/10 animate-pulse" />
        <div className="h-6 w-20 rounded-full bg-white/10 animate-pulse" />
        <div className="h-6 w-14 rounded-full bg-white/10 animate-pulse" />
      </div>

      {/* Bottom buyer card skeleton */}
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-2xl border border-white/5 bg-ink-950/60 p-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-white/10 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-white/15 animate-pulse" />
            <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
        <div className="h-5 w-14 rounded-full bg-white/10 animate-pulse" />
      </div>
    </div>
  );
}
