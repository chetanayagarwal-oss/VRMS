import { useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
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

// Category colour mapping – full Tailwind strings only
const CATEGORY_PILL = {
  Development: "border-violet-500/40 bg-violet-500/15 text-violet-300",
  Design:      "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300",
  Security:    "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  Writing:     "border-amber-500/40 bg-amber-500/15 text-amber-300",
  "AI / ML":   "border-rose-500/40 bg-rose-500/15 text-rose-300",
  Data:        "border-lime-500/40 bg-lime-500/15 text-lime-300",
  Mobile:      "border-indigo-500/40 bg-indigo-500/15 text-indigo-300",
  DevOps:      "border-sky-500/40 bg-sky-500/15 text-sky-300",
};

export default function SwipeCard({ gig, index, direction, onSwipe, onSkillClick, activeSkills = [] }) {
  const isTop = index === 0;
  const [skillToast, setSkillToast] = useState(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 0, 250], [-14, 0, 14]);
  const applyOpacity = useTransform(x, [20, 140], [0, 1]);
  const skipOpacity = useTransform(x, [-140, -20], [1, 0]);

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info;
    if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) onSwipe(1);
    else if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) onSwipe(-1);
  };

  const handleSkillClick = (e, skill) => {
    if (!isTop) return;
    e.stopPropagation(); // don't trigger drag logic
    onSkillClick?.(skill);
    // Show a brief toast on the card
    setSkillToast(skill);
    setTimeout(() => setSkillToast(null), 1400);
  };

  const catStyle = CATEGORY_PILL[gig.category] || "border-white/10 bg-white/5 text-zinc-300";

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

        {/* Skill-tap toast */}
        <AnimatePresence>
          {skillToast && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.92 }}
              className="pointer-events-none absolute left-1/2 top-5 z-30 -translate-x-1/2 rounded-full border border-accent/30 bg-ink-950/90 px-3 py-1 text-xs font-semibold text-accent-soft backdrop-blur-md"
            >
              🔍 Filtering by "{skillToast}"
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex h-full flex-col p-6 sm:p-7">
          {/* Top row – category + timeline */}
          <div className="mt-10 flex items-center justify-between gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${catStyle}`}
            >
              {gig.category}
            </span>
            <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400">
              ⏱ {gig.timeline}
            </span>
          </div>

          {/* Title + description */}
          <div className="mt-5">
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-[26px]">
              {gig.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{gig.description}</p>
          </div>

          {/* Interactive Skill Pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {gig.skills.map((skill) => {
              const isActive = activeSkills.includes(skill);
              return (
                <motion.button
                  key={skill}
                  onClick={(e) => handleSkillClick(e, skill)}
                  whileHover={isTop ? { scale: 1.08 } : {}}
                  whileTap={isTop ? { scale: 0.92 } : {}}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                    isActive
                      ? "border-accent bg-accent text-white shadow-md shadow-accent/30"
                      : isTop
                      ? "border-white/15 bg-ink-600/70 text-zinc-300 hover:border-accent/50 hover:bg-ink-600 hover:text-white"
                      : "border-white/10 bg-ink-600/70 text-zinc-400"
                  } ${isTop ? "cursor-pointer" : "cursor-default"}`}
                  title={isTop ? `Filter by ${skill}` : skill}
                >
                  {isActive && <span className="mr-1 text-[10px] opacity-80">✓</span>}
                  {skill}
                </motion.button>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* Budget Box */}
          <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
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
              {/* Tap-to-negotiate hint on top card */}
              {isTop && (
                <div className="text-right">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-400">
                    Swipe right<br />to negotiate
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buyer Row */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent-soft">
              {gig.buyer.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                <span className="truncate">{gig.buyer.name}</span>
                {gig.buyer.verified && (
                  <span
                    title="Verified buyer"
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-400/20 text-[10px] text-sky-400"
                  >
                    ✓
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span>★ {gig.buyer.rating.toFixed(1)}</span>
                <span>·</span>
                <span>{gig.buyer.jobs} jobs</span>
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
