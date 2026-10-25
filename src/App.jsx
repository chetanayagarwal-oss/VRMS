import { useState, useCallback, useReducer, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "./components/Header.jsx";
import CardStack from "./components/CardStack.jsx";
import CardSkeleton from "./components/CardSkeleton.jsx";
import ActionButtons from "./components/ActionButtons.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import NegotiationModal from "./components/NegotiationModal.jsx";
import ProfileView from "./components/ProfileView.jsx";
import SkillFilterBar from "./components/SkillFilterBar.jsx";
import LandingPage from "./components/LandingPage.jsx";
import { MOCK_GIGS, ALL_SKILLS } from "./data/gigs.js";
import { track } from "./utils/analytics.js";
import {
  dealReducer,
  initialDealState,
  DEAL_ACTIONS,
  DEAL_STATES,
} from "./state/dealMachine.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  // ── Auth State ───────────────────────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sg_user")); } catch { return null; }
  });
  const [role, setRole] = useState(() => localStorage.getItem("sg_role") || null);

  const handleEnter = (u, r) => {
    setUser(u);
    setRole(r);
  };

  const handleLogout = () => {
    localStorage.removeItem("sg_user");
    localStorage.removeItem("sg_role");
    setUser(null);
    setRole(null);
  };

  // ── Gigs & Feed loading state ───────────────────────────────────────────────
  const [gigs, setGigs] = useState(MOCK_GIGS);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const fetchGigs = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_URL}/gigs`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setGigs(data);
      } else {
        setGigs(MOCK_GIGS);
      }
    } catch (err) {
      console.warn("Could not fetch live gigs from backend:", err);
      setFetchError(
        "Unable to reach the SwipeGig backend. Ensure the FastAPI server is running on port 8000 or use offline demo mode."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

  // ── Core swiping state ──────────────────────────────────────────────────────
  const [swipedIds, setSwipedIds] = useState(new Set());
  const [matched, setMatched] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [direction, setDirection] = useState(1);
  const [completedDeals, setCompletedDeals] = useState([]);

  // ── Skill & Category Filters ─────────────────────────────────────────────────
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Remaining unswiped gigs, filtered by active skill/category selections
  const filteredGigs = useMemo(() => {
    return gigs.filter((g) => {
      if (swipedIds.has(g.id)) return false;
      if (selectedCategory && g.category !== selectedCategory) return false;
      if (selectedSkills.length > 0 && !selectedSkills.every((s) => g.skills.includes(s)))
        return false;
      return true;
    });
  }, [gigs, swipedIds, selectedSkills, selectedCategory]);

  // Skills to show in the filter bar
  const visibleSkills = useMemo(() => {
    const base = selectedCategory
      ? gigs.filter((g) => g.category === selectedCategory)
      : gigs;
    const skillSet = new Set(base.flatMap((g) => g.skills));
    return ALL_SKILLS.filter((s) => skillSet.has(s));
  }, [gigs, selectedCategory]);

  // ── Budget Settings ──────────────────────────────────────────────────────────
  const [userBudget, setUserBudget] = useState({ min: 1000, max: 3000 });

  // ── Navigation & Modals ──────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState("feed");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ── Deal State Machine ───────────────────────────────────────────────────────
  const [dealState, dispatch] = useReducer(dealReducer, initialDealState);

  // Sync completed deal into persistent list
  useEffect(() => {
    if (dealState.status === DEAL_STATES.COMPLETED && dealState.completedDeal) {
      setCompletedDeals((prev) => {
        const exists = prev.some((d) => d.id === dealState.completedDeal.id);
        if (exists) return prev;
        return [dealState.completedDeal, ...prev];
      });
    }
  }, [dealState.status, dealState.completedDeal]);

  // ── Swipe Handler with Analytics ─────────────────────────────────────────────
  const handleSwipe = useCallback(
    (dir) => {
      const top = filteredGigs[0];
      if (!top) return;
      setDirection(dir);
      setSwipedIds((prev) => new Set([...prev, top.id]));

      // Analytics event: gig_swiped
      track("gig_swiped", {
        gig_id: top.id,
        direction: dir === 1 ? "right" : "left",
        title: top.title,
        budget: top.budget,
      });

      if (dir === 1) {
        setMatched((m) => [...m, top]);
        // Analytics event: deal_started
        track("deal_started", {
          gig_id: top.id,
          user_min_budget: userBudget.min,
          user_max_budget: userBudget.max,
        });

        dispatch({
          type: DEAL_ACTIONS.START_NEGOTIATION,
          payload: { gig: top, userBudget },
        });
      } else {
        setSkipped((s) => [...s, top]);
      }
    },
    [filteredGigs, userBudget]
  );

  // ── Skill Filter Handlers ────────────────────────────────────────────────────
  const handleToggleSkill = useCallback((skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }, []);

  const handleToggleCategory = useCallback((cat) => {
    setSelectedCategory((prev) => (prev === cat ? null : cat));
    setSelectedSkills([]);
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedSkills([]);
    setSelectedCategory(null);
  }, []);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = () => {
    setSwipedIds(new Set());
    setMatched([]);
    setSkipped([]);
    setSelectedSkills([]);
    setSelectedCategory(null);
  };

  const handleCloseNegotiation = () => dispatch({ type: DEAL_ACTIONS.RESET_DEAL });
  const handleViewProfileFromModal = () => {
    dispatch({ type: DEAL_ACTIONS.RESET_DEAL });
    setCurrentView("profile");
  };

  const empty = filteredGigs.length === 0;
  const isNegotiationOpen = dealState.status !== DEAL_STATES.IDLE;
  const hasActiveFilter = selectedSkills.length > 0 || !!selectedCategory;
  const totalUnswiped = gigs.filter((g) => !swipedIds.has(g.id)).length;

  return (
    <>
      {/* ── Landing / Auth Gate ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {!user && <LandingPage key="landing" onEnter={handleEnter} />}
      </AnimatePresence>

    <div className="flex min-h-full flex-col overflow-x-hidden px-3 sm:px-4 pb-10">
      {/* ── Global Header ─────────────────────────────────────────────────────── */}
      <Header
        matched={matched.length}
        skipped={skipped.length}
        completedCount={completedDeals.length}
        currentView={currentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleProfile={(view) => setCurrentView(view)}
      />

      {/* ── Main View Router ──────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col py-4 sm:py-5">
        <AnimatePresence mode="wait">
          {currentView === "profile" ? (
            <ProfileView
              key="profile"
              completedDeals={completedDeals}
              savedGigs={matched}
              budget={userBudget}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onBackToFeed={() => setCurrentView("feed")}
            />
          ) : (
            <div key="feed" className="flex flex-1 flex-col items-center w-full max-w-[400px] mx-auto">
              {/* ── Skill & Category Filter Bar ─────────────────────────────── */}
              <SkillFilterBar
                skills={visibleSkills}
                selectedSkills={selectedSkills}
                selectedCategory={selectedCategory}
                onToggleSkill={handleToggleSkill}
                onToggleCategory={handleToggleCategory}
                onClearAll={handleClearAll}
                totalGigs={totalUnswiped}
                filteredCount={filteredGigs.length}
              />

              {/* ── Feed Content: Loading Skeleton, Error State, or Card Feed ── */}
              {isLoading ? (
                <CardSkeleton />
              ) : fetchError ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto mt-4 flex h-[520px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-amber-500/30 bg-ink-900/60 p-8 text-center backdrop-blur-xl"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-3xl text-amber-400">
                    🔌
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-white">Backend Currently Unreachable</h2>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    {fetchError}
                  </p>
                  <div className="mt-6 flex flex-col gap-2.5 w-full">
                    <button
                      onClick={fetchGigs}
                      className="min-h-[44px] rounded-full bg-accent px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-soft"
                    >
                      🔄 Retry Connection
                    </button>
                    <button
                      onClick={() => {
                        setGigs(MOCK_GIGS);
                        setFetchError(null);
                      }}
                      className="min-h-[44px] rounded-full border border-white/10 bg-ink-800 px-6 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-ink-700 hover:text-white"
                    >
                      ⚡ Load Demo Gigs Offline
                    </button>
                  </div>
                </motion.div>
              ) : empty ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto mt-4 flex h-[520px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-ink-900/50 p-8 text-center"
                >
                  {hasActiveFilter ? (
                    <>
                      <div className="text-4xl">🔍</div>
                      <h2 className="mt-4 text-xl font-bold text-white">No gigs match your filters</h2>
                      <p className="mt-2 text-sm text-zinc-400">
                        Try removing some skill or category filters to see more gigs.
                      </p>
                      <button
                        onClick={handleClearAll}
                        className="mt-5 min-h-[44px] rounded-full border border-white/10 bg-ink-800 px-5 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-ink-700 hover:text-white"
                      >
                        Clear All Filters
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl">✨</div>
                      <h2 className="mt-4 text-xl font-bold text-white">You're all caught up</h2>
                      <p className="mt-2 text-sm text-zinc-400">
                        {matched.length} gig{matched.length === 1 ? "" : "s"} saved ·{" "}
                        {completedDeals.length} deal{completedDeals.length === 1 ? "" : "s"} completed.
                      </p>
                      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                        <button
                          onClick={reset}
                          className="min-h-[44px] rounded-full bg-accent px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-soft"
                        >
                          Reload Demo Gigs
                        </button>
                        {completedDeals.length > 0 && (
                          <button
                            onClick={() => setCurrentView("profile")}
                            className="min-h-[44px] rounded-full border border-white/10 bg-ink-800 px-6 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-ink-700 hover:text-white"
                          >
                            View Profile & SBTs
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              ) : (
                <>
                  <CardStack
                    gigs={filteredGigs}
                    direction={direction}
                    onSwipe={handleSwipe}
                    onSkillClick={handleToggleSkill}
                    activeSkills={selectedSkills}
                  />
                  <ActionButtons
                    onSkip={() => handleSwipe(-1)}
                    onApply={() => handleSwipe(1)}
                    disabled={empty}
                  />
                  <p className="mt-4 text-center text-xs text-zinc-600">
                    Drag or use buttons · tap a skill tag to filter · ♥ = negotiate
                  </p>
                </>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Settings Modal ────────────────────────────────────────────────────── */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        budget={userBudget}
        onSave={(newBudget) => setUserBudget(newBudget)}
        onLogout={handleLogout}
        user={user}
        role={role}
      />

      {/* ── Full-Screen Negotiation & Escrow Modal ────────────────────────────── */}
      <NegotiationModal
        isOpen={isNegotiationOpen}
        dealState={dealState}
        dispatch={dispatch}
        onClose={handleCloseNegotiation}
        onViewProfile={handleViewProfileFromModal}
      />
      </div>
    </>
  );
}
