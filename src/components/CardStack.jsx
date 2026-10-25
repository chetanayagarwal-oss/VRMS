import { AnimatePresence } from "framer-motion";
import SwipeCard from "./SwipeCard.jsx";

const VISIBLE = 3;

export default function CardStack({ gigs, direction, onSwipe, onSkillClick, activeSkills }) {
  const visible = gigs.slice(0, VISIBLE);

  return (
    <div className="relative mx-auto h-[600px] w-full max-w-[400px]">
      <AnimatePresence custom={direction}>
        {/* Render back-to-front so the top card is last in the DOM */}
        {visible
          .map((gig, i) => ({ gig, i }))
          .reverse()
          .map(({ gig, i }) => (
            <SwipeCard
              key={gig.id}
              gig={gig}
              index={i}
              direction={direction}
              onSwipe={onSwipe}
              onSkillClick={onSkillClick}
              activeSkills={activeSkills}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
