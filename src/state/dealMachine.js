// src/state/dealMachine.js
// Standalone state machine for SwipeGig deal workflow (Part 2 MVP).
// Ready to be hooked to a backend (FastAPI/Node) and real smart contracts in Part 3-5.

export const DEAL_STATES = {
  IDLE: "idle",
  NEGOTIATING: "negotiating",
  NO_DEAL: "no_deal",
  ESCROWED: "escrowed",
  COMPLETED: "completed",
};

export const ESCROW_STAGES = {
  SUBMITTING: "Submitting",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
};

export const initialDealState = {
  status: DEAL_STATES.IDLE,
  gig: null,
  userBudget: { min: 1000, max: 3000 },
  messages: [],
  isTyping: false,
  typingSpeaker: null,
  agreedPrice: null,
  noDealReason: null,
  escrowStage: null, // "Submitting" | "Pending" | "Confirmed"
  txHash: null,
  buyerApproved: false,
  sellerApproved: false,
  completedDeal: null,
};

export const DEAL_ACTIONS = {
  START_NEGOTIATION: "START_NEGOTIATION",
  SET_TYPING: "SET_TYPING",
  ADD_MESSAGE: "ADD_MESSAGE",
  RESOLVE_NEGOTIATION: "RESOLVE_NEGOTIATION",
  ADVANCE_ESCROW: "ADVANCE_ESCROW",
  APPROVE_BUYER: "APPROVE_BUYER",
  APPROVE_SELLER: "APPROVE_SELLER",
  COMPLETE_DEAL: "COMPLETE_DEAL",
  RESET_DEAL: "RESET_DEAL",
};

export function dealReducer(state, action) {
  switch (action.type) {
    case DEAL_ACTIONS.START_NEGOTIATION:
      return {
        ...state,
        status: DEAL_STATES.NEGOTIATING,
        gig: action.payload.gig,
        userBudget: action.payload.userBudget || state.userBudget,
        messages: [],
        isTyping: false,
        typingSpeaker: "Buyer AI",
        agreedPrice: null,
        noDealReason: null,
        escrowStage: null,
        txHash: null,
        buyerApproved: false,
        sellerApproved: false,
        completedDeal: null,
      };

    case DEAL_ACTIONS.SET_TYPING:
      return {
        ...state,
        isTyping: action.payload.isTyping,
        typingSpeaker: action.payload.speaker ?? state.typingSpeaker,
      };

    case DEAL_ACTIONS.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
        isTyping: false,
      };

    case DEAL_ACTIONS.RESOLVE_NEGOTIATION:
      if (action.payload.success) {
        return {
          ...state,
          status: DEAL_STATES.ESCROWED,
          agreedPrice: action.payload.agreedPrice,
          escrowStage: ESCROW_STAGES.SUBMITTING,
          isTyping: false,
        };
      } else {
        return {
          ...state,
          status: DEAL_STATES.NO_DEAL,
          noDealReason: action.payload.reason || "No price overlap inside budget thresholds.",
          isTyping: false,
        };
      }

    case DEAL_ACTIONS.ADVANCE_ESCROW:
      return {
        ...state,
        escrowStage: action.payload.stage,
        txHash: action.payload.txHash || state.txHash,
      };

    case DEAL_ACTIONS.APPROVE_BUYER:
      return {
        ...state,
        buyerApproved: true,
      };

    case DEAL_ACTIONS.APPROVE_SELLER:
      return {
        ...state,
        sellerApproved: true,
      };

    case DEAL_ACTIONS.COMPLETE_DEAL: {
      const dealRecord = {
        id: `deal-${Date.now()}`,
        gig: state.gig,
        amount: state.agreedPrice,
        currency: state.gig?.currency || "USDC",
        txHash: state.txHash,
        completedAt: new Date().toISOString(),
        buyer: state.gig?.buyer,
        sbtMinted: {
          tokenId: `#SBT-${Math.floor(1000 + Math.random() * 9000)}`,
          tier: getTierForBudget(state.agreedPrice),
        },
      };
      return {
        ...state,
        status: DEAL_STATES.COMPLETED,
        completedDeal: dealRecord,
      };
    }

    case DEAL_ACTIONS.RESET_DEAL:
      return {
        ...initialDealState,
        userBudget: state.userBudget,
      };

    default:
      return state;
  }
}

function getTierForBudget(amount) {
  if (amount >= 3000) return "Platinum";
  if (amount >= 2000) return "Gold";
  if (amount >= 1200) return "Silver";
  return "Bronze";
}

/**
 * Generates 4 to 6 dialogue turns converging toward a midpoint
 * or gracefully failing if user's min budget > buyer's gig budget.
 */
export function generateNegotiationPlan(gig, userBudget) {
  const buyerBudget = gig.budget;
  const userMin = userBudget.min;
  const userMax = userBudget.max;

  // Check overlap: User requires at least userMin; buyer can pay up to buyerBudget
  const hasOverlap = userMin <= buyerBudget;

  if (!hasOverlap) {
    // No deal script
    const buyerOpen = Math.min(buyerBudget, Math.max(400, Math.round(buyerBudget * 0.8)));
    return {
      success: false,
      agreedPrice: null,
      reason: `Buyer maximum (${buyerBudget.toLocaleString()} ${gig.currency}) is below your hidden minimum (${userMin.toLocaleString()} ${gig.currency}).`,
      steps: [
        {
          sender: "Buyer AI",
          senderLabel: `${gig.buyer.name} AI Agent`,
          avatar: gig.buyer.name[0],
          text: `Initiating discussion for "${gig.title}". We propose an opening allocation of ${buyerOpen.toLocaleString()} ${gig.currency} for this scope.`,
          offer: buyerOpen,
        },
        {
          sender: "Seller AI",
          senderLabel: "Your AI Agent",
          avatar: "⚡",
          text: `Reviewing requirements. Based on required stack (${gig.skills.slice(0, 2).join(", ")}), our floor is strictly ${userMin.toLocaleString()} ${gig.currency}.`,
          offer: userMin,
        },
        {
          sender: "Buyer AI",
          senderLabel: `${gig.buyer.name} AI Agent`,
          avatar: gig.buyer.name[0],
          text: `Our absolute ceiling for this project is capped at ${buyerBudget.toLocaleString()} ${gig.currency}. We cannot stretch further.`,
          offer: buyerBudget,
        },
        {
          sender: "Seller AI",
          senderLabel: "Your AI Agent",
          avatar: "⚡",
          text: `Our parameters prevent accepting below ${userMin.toLocaleString()} ${gig.currency}. No deal reached. Terminating negotiation session.`,
          offer: null,
        },
      ],
    };
  }

  // Calculate target agreed price inside both ranges:
  const overlapFloor = userMin;
  const overlapCeiling = Math.min(userMax, buyerBudget);
  const midpoint = Math.round((overlapFloor + overlapCeiling) / 2 / 25) * 25;
  const agreedPrice = Math.min(overlapCeiling, Math.max(overlapFloor, midpoint));

  const buyerOpen = Math.max(
    Math.round((buyerBudget * 0.72) / 25) * 25,
    Math.round((userMin * 0.85) / 25) * 25
  );
  const sellerOpen = Math.min(
    userMax,
    Math.max(agreedPrice + 350, Math.round((userMax * 0.95) / 25) * 25)
  );
  const buyerCounter = Math.round((buyerOpen + agreedPrice) / 2 / 25) * 25;

  return {
    success: true,
    agreedPrice,
    steps: [
      {
        sender: "Buyer AI",
        senderLabel: `${gig.buyer.name} AI Agent`,
        avatar: gig.buyer.name[0],
        text: `Hello! We're reviewing your profile for "${gig.title}". We'd like to open discussions at ${buyerOpen.toLocaleString()} ${gig.currency} for the ${gig.timeline} timeline.`,
        offer: buyerOpen,
      },
      {
        sender: "Seller AI",
        senderLabel: "Your AI Agent",
        avatar: "⚡",
        text: `Greetings! Given the deliverables in ${gig.skills.slice(0, 3).join(", ")}, our initial estimate is ${sellerOpen.toLocaleString()} ${gig.currency}.`,
        offer: sellerOpen,
      },
      {
        sender: "Buyer AI",
        senderLabel: `${gig.buyer.name} AI Agent`,
        avatar: gig.buyer.name[0],
        text: `We appreciate the expertise. We can raise our allocation to ${buyerCounter.toLocaleString()} ${gig.currency} with standard milestone escrow protection.`,
        offer: buyerCounter,
      },
      {
        sender: "Seller AI",
        senderLabel: "Your AI Agent",
        avatar: "⚡",
        text: `We can meet closer to your allocation if we streamline the initial kickoff. Counter at ${agreedPrice.toLocaleString()} ${gig.currency}.`,
        offer: agreedPrice,
      },
      {
        sender: "Buyer AI",
        senderLabel: `${gig.buyer.name} AI Agent`,
        avatar: gig.buyer.name[0],
        text: `${agreedPrice.toLocaleString()} ${gig.currency} is acceptable for our milestone schedule. Let's lock this in.`,
        offer: agreedPrice,
      },
      {
        sender: "Seller AI",
        senderLabel: "Your AI Agent",
        avatar: "⚡",
        text: `Deal agreed at ${agreedPrice.toLocaleString()} ${gig.currency}! Preparing smart-contract escrow deposit...`,
        offer: agreedPrice,
      },
    ],
  };
}
