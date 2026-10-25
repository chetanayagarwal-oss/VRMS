import { useState, useCallback, useReducer, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "./components/Header.jsx";
import CardStack from "./components/CardStack.jsx";
import ActionButtons from "./components/ActionButtons.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import NegotiationModal from "./components/NegotiationModal.jsx";
import ProfileView from "./components/ProfileView.jsx";
import { MOCK_GIGS } from "./data/gigs.js";
import {
  dealReducer,
  initialDealState,
  DEAL_ACTIONS,
  DEAL_STATES,
} from "./state/dealMachine.js";

export default function App() {
  const [gigs, setGigs] = useState(MOCK_GIGS);
  const [direction, setDirection] = useState(1); // 1 = right, -1 = left
  const [matched, setMatched] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [completedDeals, setCompletedDeals] = useState([]);

  // Hidden AI Negotiation Budget Parameters (USDC)
  const [userBudget, setUserBudget] = useState({ min: 1000, max: 3000 });

  // Navigation & Modals
  const [currentView, setCurrentView] = useState("feed"); // "feed" | "profile"
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Standalone Deal State Machine (src/state/dealMachine.js)
  const [dealState, dispatch] = useReducer(dealReducer, initialDealState);

  // Sync newly completed deal into completedDeals persistent list
  useEffect(() => {
    if (dealState.status === DEAL_STATES.COMPLETED && dealState.completedDeal) {
      setCompletedDeals((prev) => {
        const exists = prev.some((d) => d.id === dealState.completedDeal.id);
        if (exists) return prev;
        return [dealState.completedDeal, ...prev];
      });
    }
  }, [dealState.status, dealState.completedDeal]);

  // Swipe Handler
  const handleSwipe = useCallback(
    (dir) => {
      const top = gigs[0];
      if (!top) return;
      setDirection(dir);

      if (dir === 1) {
        // Swiped right / Interested: Save gig and launch AI negotiation modal
        setMatched((m) => [...m, top]);
        dispatch({
          type: DEAL_ACTIONS.START_NEGOTIATION,
          payload: { gig: top, userBudget },
        });
      } else {
        // Swiped left: Skip
        setSkipped((s) => [...s, top]);
      }
      setGigs((g) => g.slice(1));
    },
    [gigs, userBudget]
  );

  const reset = () => {
    setGigs(MOCK_GIGS);
    setMatched([]);
    setSkipped([]);
  };

  const handleCloseNegotiation = () => {
    dispatch({ type: DEAL_ACTIONS.RESET_DEAL });
  };

  const handleViewProfileFromModal = () => {
    dispatch({ type: DEAL_ACTIONS.RESET_DEAL });
    setCurrentView("profile");
  };

  const empty = gigs.length === 0;
  const isNegotiationOpen = dealState.status !== DEAL_STATES.IDLE;

  return (
    <div className="flex min-h-full flex-col overflow-x-hidden px-4 pb-10">
      {/* Global Header */}
      <Header
        matched={matched.length}
        skipped={skipped.length}
        completedCount={completedDeals.length}
        currentView={currentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleProfile={(view) => setCurrentView(view)}
      />

      {/* Main View Router */}
      <main className="flex flex-1 flex-col justify-center py-4 sm:py-6">
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
            <div key="feed" className="flex flex-1 flex-col justify-center">
              {empty ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto flex h-[580px] w-full max-w-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-ink-900/50 p-8 text-center"
                >
                  <div className="text-4xl">✨</div>
                  <h2 className="mt-4 text-xl font-bold text-white">You're all caught up</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    {matched.length} gig{matched.length === 1 ? "" : "s"} saved ·{" "}
                    {completedDeals.length} deal{completedDeals.length === 1 ? "" : "s"} completed.
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={reset}
                      className="rounded-full bg-accent px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-accent-soft shadow-lg shadow-accent/20"
                    >
                      Reload Demo Gigs
                    </button>
                    {completedDeals.length > 0 && (
                      <button
                        onClick={() => setCurrentView("profile")}
                        className="rounded-full border border-white/10 bg-ink-800 px-6 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-ink-700 hover:text-white"
                      >
                        View Profile & SBTs
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <>
                  <CardStack gigs={gigs} direction={direction} onSwipe={handleSwipe} />
                  <ActionButtons
                    onSkip={() => handleSwipe(-1)}
                    onApply={() => handleSwipe(1)}
                    disabled={empty}
                  />
                  <p className="mt-5 text-center text-xs text-zinc-600">
                    Drag the card or use buttons · right = interested & negotiate, left = skip
                  </p>
                </>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Panel Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        budget={userBudget}
        onSave={(newBudget) => setUserBudget(newBudget)}
      />

      {/* Full-Screen Negotiation & Escrow Modal */}
      <NegotiationModal
        isOpen={isNegotiationOpen}
        dealState={dealState}
        dispatch={dispatch}
        onClose={handleCloseNegotiation}
        onViewProfile={handleViewProfileFromModal}
      />
    </div>
  );
}
