import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ALL_CATEGORIES } from "../data/gigs.js";

// Category colour palette – must use full Tailwind strings (no dynamic builds)
const CATEGORY_STYLES = {
  Development: "border-violet-500/40 bg-violet-500/15 text-violet-300",
  Design:      "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300",
  Security:    "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  Writing:     "border-amber-500/40 bg-amber-500/15 text-amber-300",
  "AI / ML":   "border-rose-500/40 bg-rose-500/15 text-rose-300",
  Data:        "border-lime-500/40 bg-lime-500/15 text-lime-300",
  Mobile:      "border-indigo-500/40 bg-indigo-500/15 text-indigo-300",
  DevOps:      "border-sky-500/40 bg-sky-500/15 text-sky-300",
};

const SKILL_ACTIVE = "border-accent bg-accent text-white shadow-lg shadow-accent/30";
const SKILL_IDLE   = "border-white/10 bg-white/5 text-zinc-300 hover:border-white/25 hover:bg-white/10 hover:text-white";

export default function SkillFilterBar({
  skills,
  selectedSkills,
  selectedCategory,
  onToggleSkill,
  onToggleCategory,
  onClearAll,
  totalGigs,
  filteredCount,
}) {
  const skillsScrollRef = useRef(null);

  // When a new skill is selected, scroll its pill into view
  useEffect(() => {
    if (!selectedSkills.length) return;
    const last = selectedSkills[selectedSkills.length - 1];
    const el = document.getElementById(`skill-pill-${CSS.escape(last)}`);
    el?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [selectedSkills]);

  const hasActiveFilter = selectedSkills.length > 0 || selectedCategory;

  return (
    <div className="mx-auto w-full max-w-[440px] space-y-2.5 pb-3">
      {/* ── Category Chips Row ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {/* "All" reset chip */}
        <button
          onClick={onClearAll}
          className={`flex-shrink-0 rounded-full border px-3.5 py-1 text-xs font-semibold transition ${
            !hasActiveFilter
              ? "border-accent bg-accent text-white"
              : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
          }`}
        >
          All
        </button>

        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onToggleCategory(cat)}
            className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
              selectedCategory === cat
                ? CATEGORY_STYLES[cat] || SKILL_ACTIVE
                : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Skill Pills Scrollable Row ── */}
      <div
        ref={skillsScrollRef}
        className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
      >
        {skills.map((skill) => {
          const active = selectedSkills.includes(skill);
          return (
            <motion.button
              id={`skill-pill-${skill}`}
              key={skill}
              onClick={() => onToggleSkill(skill)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              className={`flex-shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                active ? SKILL_ACTIVE : SKILL_IDLE
              }`}
            >
              {active && <span className="mr-1 opacity-70">✓</span>}
              {skill}
            </motion.button>
          );
        })}
      </div>

      {/* ── Active Filter Summary Bar ── */}
      <AnimatePresence>
        {hasActiveFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between rounded-xl border border-accent/20 bg-accent/8 px-3 py-1.5"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedCategory && (
                <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-200">
                  📂 {selectedCategory}
                  <button
                    onClick={() => onToggleCategory(selectedCategory)}
                    className="ml-0.5 text-zinc-400 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedSkills.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent-soft"
                >
                  {s}
                  <button
                    onClick={() => onToggleSkill(s)}
                    className="ml-0.5 text-accent/60 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="ml-2 flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] font-semibold text-zinc-400">
                {filteredCount}/{totalGigs}
              </span>
              <button
                onClick={onClearAll}
                className="text-[10px] font-semibold text-accent-soft hover:text-white underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
