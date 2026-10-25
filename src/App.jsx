import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Header from "./components/Header.jsx";
import CardStack from "./components/CardStack.jsx";
import ActionButtons from "./components/ActionButtons.jsx";
import { MOCK_GIGS } from "./data/gigs.js";

export default function App() {
  const [gigs, setGigs] = useState(MOCK_GIGS);
  const [direction, setDirection] = useState(1); // 1 = right, -1 = left
  const [matched, setMatched] = useState([]);
  const [skipped, setSkipped] = useState([]);

  const handleSwipe = useCallback(
    (dir) => {
      const top = gigs[0];
      if (!top) return;
      setDirection(dir);
      if (dir === 1) {
        // PART 2 hook: open the AI negotiation modal for `top` here.
        setMatched((m) => [...m, top]);
      } else {
        setSkipped((s) => [...s, top]);
      }
      setGigs((g) => g.slice(1));
    },
    [gigs]
  );

  const reset = () => {
    setGigs(MOCK_GIGS);
    setMatched([]);
    setSkipped([]);
  };

  const empty = gigs.length === 0;

  return (
    <div className="flex min-h-full flex-col overflow-hidden px-4 pb-10">
      <Header matched={matched.length} skipped={skipped.length} />

      <main className="flex flex-1 flex-col justify-center py-6">
        {empty ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto flex h-[600px] w-full max-w-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-ink-900/50 p-8 text-center"
          >
            <div className="text-4xl">✨</div>
            <h2 className="mt-4 text-xl font-bold">You're all caught up</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {matched.length} gig{matched.length === 1 ? "" : "s"} saved. New gigs matching your
              profile will show up here.
            </p>
            <button
              onClick={reset}
              className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft"
            >
              Reload demo gigs
            </button>
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
              Drag the card or use the buttons · right = interested, left = skip
            </p>
          </>
        )}
      </main>
    </div>
  );
}
