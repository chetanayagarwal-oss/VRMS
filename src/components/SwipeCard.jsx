import { motion, useMotionValue, useTransform } from "framer-motion";
import SBTBadge from "./SBTBadge.jsx";

const SWIPE_DISTANCE = 120; // px needed to commit a swipe
const SWIPE_VELOCITY = 500; // px/s flick velocity that also commits

const exitVariants = {
  exit: (direction) => ({
    x: direction * 650,
    rotate: direction * 18,
    opacity: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function SwipeCard({ gig, index, direction, onSwipe }) {
  const isTop = index === 0;

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 0, 250], [-14, 0, 14]);
  const applyOpacity = useTransform(x, [20, 140], [0, 1]);
  const skipOpacity = useTransform(x, [-140, -20], [1, 0]);

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info;
    if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) onSwipe(1);
    else if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) onSwipe(-1);
  };

  return (
    <motion.div
      className="swipe-surface absolute inset-0"
      style={{ x: isTop ? x : 0, rotate: isTop ? rotate : 0, zIndex: 10 - index }}
      custom={direction}
      variants={exitVariants}
      exit="exit"
      initial={{ scale: 0.92, y: 28, opacity: 0 }}
      animate={{
        scale: 1 - index * 0.05,
        y: index * 16,
        opacity: 1 - index * 0.25,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      whileDrag={{ cursor: "grabbing" }}
      onDragEnd={isTop ? handleDragEnd : undefined}
    >
      <div
        className={`relative h-full w-full overflow-hidden rounded-3xl bg-ink-800 shadow-card ${
          isTop ? "cursor-grab" : ""
        }`}
      >
        {/* Ambient category gradient */}
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gig.gradient}`} />

        {/* Swipe feedback stamps */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: applyOpacity }}
              className="pointer-events-none absolute left-6 top-6 z-20 -rotate-12 rounded-xl border-2 border-emerald-400 px-4 py-1.5 text-lg font-extrabold uppercase tracking-widest text-emerald-400"
            >
              Interested
            </motion.div>
            <motion.div
              style={{ opacity: skipOpacity }}
              className="pointer-events-none absolute right-6 top-6 z-20 rotate-12 rounded-xl border-2 border-rose-400 px-4 py-1.5 text-lg font-extrabold uppercase tracking-widest text-rose-400"
            >
              Skip
            </motion.div>
          </>
        )}

        <div className="relative flex h-full flex-col p-6 sm:p-7">
          {/* Top row */}
          <div className="mt-10 flex items-center justify-between">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
              {gig.category}
            </span>
            <span className="text-xs font-medium text-zinc-400">
              ⏱ {gig.timeline}
            </span>
          </div>

          {/* Title + description */}
          <div className="mt-6">
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-[26px]">
              {gig.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{gig.description}</p>
          </div>

          {/* Skills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {gig.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-md bg-ink-600/70 px-2.5 py-1 text-xs font-medium text-zinc-300"
              >
                {skill}
              </span>
            ))}
          </div>

          <div className="flex-1" />

          {/* Budget */}
          <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-4 backdrop-blur">
            <div className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
              Budget
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold text-white">
                {gig.budget.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-zinc-400">{gig.currency}</span>
            </div>
          </div>

          {/* Buyer */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent-soft">
              {gig.buyer.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                <span className="truncate">{gig.buyer.name}</span>
                {gig.buyer.verified && (
                  <span title="Verified" className="text-sky-400">
                    ✓
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                ★ {gig.buyer.rating.toFixed(1)} · {gig.buyer.jobs} jobs
              </div>
            </div>
            {gig.buyer.sbt && (
              <SBTBadge count={gig.buyer.sbt.count} tier={gig.buyer.sbt.tier} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
