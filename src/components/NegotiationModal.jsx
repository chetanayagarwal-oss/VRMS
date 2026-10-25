import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SBTBadge from "./SBTBadge.jsx";
import {
  DEAL_STATES,
  ESCROW_STAGES,
  DEAL_ACTIONS,
  generateNegotiationPlan,
} from "../state/dealMachine.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function CheckIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function LockIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

export default function NegotiationModal({
  isOpen,
  dealState,
  dispatch,
  onClose,
  onViewProfile,
}) {
  const [activeTab, setActiveTab] = useState("negotiation"); // "negotiation" | "escrow"
  const [copied, setCopied] = useState(false);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [currentNegotiationId, setCurrentNegotiationId] = useState(null);
  const [plan, setPlan] = useState(null); // Local fallback plan if backend offline

  const chatBottomRef = useRef(null);
  const eventSourceRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Fallback simulator if backend is offline
  const startLocalSimulation = useCallback(() => {
    if (!dealState.gig) return;
    setBackendLoading(false);
    setBackendError(null);

    const generatedPlan = generateNegotiationPlan(dealState.gig, dealState.userBudget);
    setPlan(generatedPlan);
    setActiveTab("negotiation");

    let currentStep = 0;
    const cleanupTimers = [];

    const runNextStep = () => {
      if (currentStep >= generatedPlan.steps.length) {
        if (generatedPlan.success) {
          dispatch({
            type: DEAL_ACTIONS.RESOLVE_NEGOTIATION,
            payload: { success: true, agreedPrice: generatedPlan.agreedPrice },
          });
          setActiveTab("escrow");
        } else {
          dispatch({
            type: DEAL_ACTIONS.RESOLVE_NEGOTIATION,
            payload: { success: false, reason: generatedPlan.reason },
          });
        }
        return;
      }

      const step = generatedPlan.steps[currentStep];

      dispatch({
        type: DEAL_ACTIONS.SET_TYPING,
        payload: { isTyping: true, speaker: step.senderLabel },
      });

      const timer = setTimeout(() => {
        dispatch({
          type: DEAL_ACTIONS.ADD_MESSAGE,
          payload: {
            ...step,
            id: `local-msg-${currentStep}-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        });

        currentStep++;
        const nextTimer = setTimeout(runNextStep, 700);
        cleanupTimers.push(nextTimer);
      }, 800);

      cleanupTimers.push(timer);
    };

    const initTimer = setTimeout(runNextStep, 300);
    cleanupTimers.push(initTimer);
  }, [dealState.gig, dealState.userBudget, dispatch]);

  // Connect to FastAPI backend via SSE
  const startBackendNegotiation = useCallback(async () => {
    if (!dealState.gig) return;

    // Close any previous event source
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setBackendLoading(true);
    setBackendError(null);
    setActiveTab("negotiation");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${API_URL}/negotiations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gig_id: dealState.gig.id,
          user_id: "user-anon",
          min_budget: dealState.userBudget.min,
          max_budget: dealState.userBudget.max,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`FastAPI returned HTTP status ${response.status}`);
      }

      const data = await response.json();
      const negId = data.negotiation_id;
      setCurrentNegotiationId(negId);
      setBackendLoading(false);

      // Open SSE stream
      const es = new EventSource(`${API_URL}/negotiations/${negId}/stream`);
      eventSourceRef.current = es;

      // Handle message events from agents
      es.addEventListener("message", (e) => {
        try {
          const item = JSON.parse(e.data);
          const isBuyer = item.role === "buyer";

          dispatch({
            type: DEAL_ACTIONS.ADD_MESSAGE,
            payload: {
              id: `sse-msg-${item.round}-${item.role}-${Date.now()}`,
              sender: isBuyer ? "Buyer AI" : "Seller AI",
              senderLabel: isBuyer ? "Buyer AI" : "Seller AI",
              avatar: isBuyer ? "🤖" : "⚡",
              text: item.text,
              offer: item.offer,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          });

          // Show typing indicator for the other agent
          dispatch({
            type: DEAL_ACTIONS.SET_TYPING,
            payload: {
              isTyping: true,
              speaker: isBuyer ? "Seller AI" : "Buyer AI",
            },
          });
        } catch (err) {
          console.error("Failed to parse SSE message payload:", err);
        }
      });

      // Handle completion event
      es.addEventListener("done", (e) => {
        try {
          const res = JSON.parse(e.data);
          es.close();
          eventSourceRef.current = null;

          dispatch({
            type: DEAL_ACTIONS.SET_TYPING,
            payload: { isTyping: false },
          });

          if (res.status === "agreed") {
            dispatch({
              type: DEAL_ACTIONS.RESOLVE_NEGOTIATION,
              payload: { success: true, agreedPrice: res.price },
            });
            setActiveTab("escrow");
          } else {
            dispatch({
              type: DEAL_ACTIONS.RESOLVE_NEGOTIATION,
              payload: { success: false, reason: res.reason || "No budget overlap inside thresholds." },
            });
          }
        } catch (err) {
          console.error("Failed to parse SSE completion payload:", err);
        }
      });

      es.onerror = (err) => {
        // If stream error occurs before messages
        console.warn("EventSource stream encountered a connection error:", err);
        es.close();
        eventSourceRef.current = null;
        dispatch({
          type: DEAL_ACTIONS.SET_TYPING,
          payload: { isTyping: false },
        });
      };
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("FastAPI backend unreachable:", err);
      setBackendLoading(false);
      setBackendError(
        `Backend service at ${API_URL} is unreachable. Ensure the FastAPI server is running with 'uvicorn main:app --reload', or use the local simulator.`
      );
    }
  }, [dealState.gig, dealState.userBudget, dispatch]);

  // Trigger negotiation when modal opens in NEGOTIATING state with empty messages
  useEffect(() => {
    if (!isOpen || !dealState.gig) return;

    if (dealState.status === DEAL_STATES.NEGOTIATING && dealState.messages.length === 0) {
      startBackendNegotiation();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, dealState.gig, dealState.status, startBackendNegotiation]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dealState.messages, dealState.isTyping, backendLoading]);

  // Handle escrow simulated lifecycle (Submitting -> Pending -> Confirmed)
  useEffect(() => {
    if (dealState.status === DEAL_STATES.ESCROWED) {
      setActiveTab("escrow");

      if (dealState.escrowStage === ESCROW_STAGES.SUBMITTING) {
        const timer1 = setTimeout(() => {
          dispatch({
            type: DEAL_ACTIONS.ADVANCE_ESCROW,
            payload: { stage: ESCROW_STAGES.PENDING },
          });
        }, 1300);
        return () => clearTimeout(timer1);
      }

      if (dealState.escrowStage === ESCROW_STAGES.PENDING) {
        const timer2 = setTimeout(() => {
          const fakeHash = `0x3f9a${Math.random().toString(16).substring(2, 8)}...${Math.random()
            .toString(16)
            .substring(2, 6)}`;
          dispatch({
            type: DEAL_ACTIONS.ADVANCE_ESCROW,
            payload: { stage: ESCROW_STAGES.CONFIRMED, txHash: fakeHash },
          });
        }, 1600);
        return () => clearTimeout(timer2);
      }
    }
  }, [dealState.status, dealState.escrowStage, dispatch]);

  // Handle auto-completion when both buyer and seller approve
  useEffect(() => {
    if (dealState.buyerApproved && dealState.sellerApproved && dealState.status !== DEAL_STATES.COMPLETED) {
      const timer = setTimeout(() => {
        dispatch({ type: DEAL_ACTIONS.COMPLETE_DEAL });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [dealState.buyerApproved, dealState.sellerApproved, dealState.status, dispatch]);

  if (!isOpen || !dealState.gig) return null;

  const { gig } = dealState;

  const handleCopyTx = () => {
    if (dealState.txHash) {
      navigator.clipboard.writeText(dealState.txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFastForward = async () => {
    if (currentNegotiationId) {
      try {
        const res = await fetch(`${API_URL}/negotiations/${currentNegotiationId}`);
        if (res.ok) {
          const result = await res.json();
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          if (result.status === "agreed") {
            dispatch({
              type: DEAL_ACTIONS.RESOLVE_NEGOTIATION,
              payload: { success: true, agreedPrice: result.agreed_price },
            });
            setActiveTab("escrow");
          } else {
            dispatch({
              type: DEAL_ACTIONS.RESOLVE_NEGOTIATION,
              payload: { success: false, reason: result.reason },
            });
          }
          return;
        }
      } catch (e) {
        // fallback
      }
    }

    if (plan) {
      plan.steps.forEach((step, idx) => {
        dispatch({
          type: DEAL_ACTIONS.ADD_MESSAGE,
          payload: {
            ...step,
            id: `ff-msg-${idx}-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        });
      });

      if (plan.success) {
        dispatch({
          type: DEAL_ACTIONS.RESOLVE_NEGOTIATION,
          payload: { success: true, agreedPrice: plan.agreedPrice },
        });
        setActiveTab("escrow");
      } else {
        dispatch({
          type: DEAL_ACTIONS.RESOLVE_NEGOTIATION,
          payload: { success: false, reason: plan.reason },
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950/90 backdrop-blur-xl">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-black text-white">
            SG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-soft">
                Autonomous AI Negotiation (Part 3 Real SSE)
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-sm font-bold text-white sm:text-base truncate max-w-[220px] sm:max-w-md">
              {gig.title}
            </h2>
          </div>
        </div>

        {/* Tab switcher & Close */}
        <div className="flex items-center gap-3">
          {(dealState.status === DEAL_STATES.ESCROWED ||
            dealState.status === DEAL_STATES.COMPLETED) && (
            <div className="flex rounded-full border border-white/10 bg-ink-900 p-0.5 text-xs">
              <button
                onClick={() => setActiveTab("negotiation")}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  activeTab === "negotiation" ? "bg-white/10 text-white" : "text-zinc-400"
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab("escrow")}
                className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium transition ${
                  activeTab === "escrow" ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-400"
                }`}
              >
                <LockIcon className="h-3 w-3" />
                Escrow
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close deal flow"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
        {/* Deal Header Summary Card */}
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-ink-900/60 p-3.5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 font-bold text-accent-soft">
              {gig.buyer.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{gig.buyer.name}</span>
                {gig.buyer.sbt && (
                  <SBTBadge count={gig.buyer.sbt.count} tier={gig.buyer.sbt.tier} />
                )}
              </div>
              <span className="text-xs text-zinc-400">
                Headline Budget: {gig.budget.toLocaleString()} {gig.currency} · ⏱ {gig.timeline}
              </span>
            </div>
          </div>

          <div className="text-right">
            {dealState.status === DEAL_STATES.NEGOTIATING && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-soft">
                <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
                Negotiating
              </span>
            )}
            {dealState.status === DEAL_STATES.NO_DEAL && (
              <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
                No Deal Reached
              </span>
            )}
            {(dealState.status === DEAL_STATES.ESCROWED ||
              dealState.status === DEAL_STATES.COMPLETED) && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <LockIcon className="h-3 w-3" />
                {dealState.agreedPrice?.toLocaleString()} {gig.currency} Escrowed
              </span>
            )}
          </div>
        </div>

        {/* Tab 1: Negotiation Live Chat View */}
        {activeTab === "negotiation" && (
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900/40 p-4">
            {/* Chat header disclaimer */}
            <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Backend SSE Stream · {API_URL}
              </span>
              {dealState.status === DEAL_STATES.NEGOTIATING && (
                <button
                  onClick={handleFastForward}
                  className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400 hover:border-accent hover:text-white"
                >
                  Fast Forward ⏩
                </button>
              )}
            </div>

            {/* Backend Loading State */}
            {backendLoading && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <span className="absolute h-full w-full rounded-full bg-accent/20 animate-ping" />
                  <span className="h-8 w-8 rounded-full bg-accent/40 animate-pulse flex items-center justify-center text-sm font-bold text-white">⚡</span>
                </div>
                <h4 className="mt-3 text-sm font-semibold text-white">Connecting to AI Agents...</h4>
                <p className="mt-1 text-xs text-zinc-400">Buyer AI & Seller AI are loading private budget parameters</p>
              </div>
            )}

            {/* Backend Error State Banner */}
            {backendError && (
              <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <span>⚠️</span>
                  <span>Backend Offline Notice</span>
                </div>
                <p className="mt-1 text-zinc-300 leading-relaxed">{backendError}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={startBackendNegotiation}
                    className="rounded-lg bg-amber-500/20 px-3 py-1.5 font-semibold text-amber-200 hover:bg-amber-500/30 transition border border-amber-500/30"
                  >
                    🔄 Retry FastAPI Connection
                  </button>
                  <button
                    onClick={startLocalSimulation}
                    className="rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 font-semibold text-white hover:bg-ink-700 transition"
                  >
                    ⚡ Run Offline Simulator
                  </button>
                </div>
              </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
              {dealState.messages.map((msg) => {
                const isBuyer = msg.sender === "Buyer AI";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.28 }}
                    className={`flex items-start gap-2.5 ${isBuyer ? "justify-start" : "justify-end"}`}
                  >
                    {isBuyer && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-300">
                        {msg.avatar || "🤖"}
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                        isBuyer
                          ? "rounded-tl-sm border border-white/10 bg-ink-800 text-zinc-200"
                          : "rounded-tr-sm border border-accent/30 bg-accent/15 text-zinc-100 shadow-lg shadow-accent/5"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                        <span
                          className={`font-semibold ${
                            isBuyer ? "text-emerald-400" : "text-accent-soft"
                          }`}
                        >
                          {msg.senderLabel}
                        </span>
                        <span className="text-zinc-500">{msg.timestamp}</span>
                      </div>

                      <p>{msg.text}</p>

                      {msg.offer && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-950/70 px-2.5 py-1 text-xs font-semibold text-white">
                          <span>Offer:</span>
                          <span className="font-mono text-emerald-400">
                            {msg.offer.toLocaleString()} {gig.currency}
                          </span>
                        </div>
                      )}
                    </div>

                    {!isBuyer && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/30 text-xs font-bold text-accent-soft">
                        ⚡
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Typing Indicator */}
              {dealState.isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-xs text-zinc-400 pl-1"
                >
                  <div className="flex gap-1 rounded-full border border-white/10 bg-ink-800 px-3 py-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {dealState.typingSpeaker || "Agent"} is analyzing parameters...
                  </span>
                </motion.div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Bottom State Bar for Negotiation Chat */}
            {dealState.status === DEAL_STATES.NO_DEAL && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-center"
              >
                <div className="text-xl">⚠️</div>
                <h4 className="mt-1 text-sm font-bold text-rose-300">
                  Negotiation Terminated – No Deal Reached
                </h4>
                <p className="mt-1 text-xs text-zinc-400">{dealState.noDealReason}</p>
                <button
                  onClick={onClose}
                  className="mt-3 rounded-full bg-ink-800 border border-white/10 px-5 py-2 text-xs font-semibold text-white transition hover:bg-ink-700"
                >
                  Close & Back to Feed
                </button>
              </motion.div>
            )}

            {dealState.status === DEAL_STATES.ESCROWED && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤝</span>
                  <div>
                    <div className="text-xs font-bold text-emerald-300">
                      Agreement Reached: {dealState.agreedPrice?.toLocaleString()} {gig.currency}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Proceed to smart-contract escrow deposit.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("escrow")}
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold text-ink-950 transition hover:bg-emerald-400"
                >
                  View Escrow →
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* Tab 2: Escrow & Milestone Completion Flow */}
        {activeTab === "escrow" && (
          <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl border border-white/10 bg-ink-900/40 p-4 sm:p-6">
            {/* Escrow Hero Banner */}
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 to-ink-800 p-6 text-center shadow-card relative overflow-hidden">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />

              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <LockIcon className="h-3.5 w-3.5" />
                Locked in Escrow (GigEscrow.sol)
              </div>

              <div className="mt-3 flex items-baseline justify-center gap-2">
                <span className="font-mono text-4xl font-extrabold text-white sm:text-5xl">
                  {dealState.agreedPrice?.toLocaleString()}
                </span>
                <span className="font-semibold text-zinc-400">{gig.currency}</span>
              </div>

              <p className="mt-2 text-xs text-zinc-400">
                Smart-contract escrow holds buyer's deposit on Arbitrum Sepolia testnet.
              </p>

              {/* Transaction Hash */}
              {dealState.txHash && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/70 px-3 py-1.5 text-xs font-mono text-zinc-300">
                  <span className="text-zinc-500">tx:</span>
                  <span>{dealState.txHash}</span>
                  <button
                    onClick={handleCopyTx}
                    className="ml-1 text-[11px] text-accent-soft hover:text-white"
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>

            {/* Simulated Transaction Progress Bar */}
            <div className="mt-5 rounded-2xl border border-white/10 bg-ink-900/60 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Transaction Lifecycle
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Stage 1: Submitting */}
                <div
                  className={`rounded-xl border p-2.5 text-center transition ${
                    dealState.escrowStage === ESCROW_STAGES.SUBMITTING
                      ? "border-accent bg-accent/20 text-white"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                    {dealState.escrowStage === ESCROW_STAGES.SUBMITTING ? (
                      <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
                    ) : (
                      <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    1. Submitting
                  </div>
                  <div className="mt-0.5 text-[10px] text-zinc-400">Gas sponsored (AA)</div>
                </div>

                {/* Stage 2: Pending */}
                <div
                  className={`rounded-xl border p-2.5 text-center transition ${
                    dealState.escrowStage === ESCROW_STAGES.PENDING
                      ? "border-amber-500 bg-amber-500/20 text-white"
                      : dealState.escrowStage === ESCROW_STAGES.CONFIRMED
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-white/5 bg-ink-950 text-zinc-600"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                    {dealState.escrowStage === ESCROW_STAGES.PENDING ? (
                      <span className="h-3 w-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                    ) : dealState.escrowStage === ESCROW_STAGES.CONFIRMED ? (
                      <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      "⏳"
                    )}
                    2. Pending
                  </div>
                  <div className="mt-0.5 text-[10px] text-zinc-400">Mempool inclusion</div>
                </div>

                {/* Stage 3: Confirmed */}
                <div
                  className={`rounded-xl border p-2.5 text-center transition ${
                    dealState.escrowStage === ESCROW_STAGES.CONFIRMED
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-md shadow-emerald-500/10"
                      : "border-white/5 bg-ink-950 text-zinc-600"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                    {dealState.escrowStage === ESCROW_STAGES.CONFIRMED ? (
                      <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      "🔒"
                    )}
                    3. Confirmed
                  </div>
                  <div className="mt-0.5 text-[10px] text-zinc-400">Smart escrow locked</div>
                </div>
              </div>
            </div>

            {/* Completion & Sign-off Section */}
            {dealState.escrowStage === ESCROW_STAGES.CONFIRMED &&
              dealState.status !== DEAL_STATES.COMPLETED && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 rounded-2xl border border-white/10 bg-ink-900/60 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        Milestone Completion Sign-Off
                      </h4>
                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        Both parties must call approveCompletion(dealId) on GigEscrow.
                      </p>
                    </div>
                    <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] text-zinc-400">
                      {[dealState.buyerApproved, dealState.sellerApproved].filter(Boolean).length}/2
                      approved
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Buyer Button */}
                    <button
                      onClick={() => dispatch({ type: DEAL_ACTIONS.APPROVE_BUYER })}
                      disabled={dealState.buyerApproved}
                      className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-xs font-bold transition shadow-sm ${
                        dealState.buyerApproved
                          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                          : "border-white/15 bg-ink-800 text-white hover:border-emerald-500/40 hover:bg-ink-700"
                      }`}
                    >
                      {dealState.buyerApproved ? (
                        <>
                          <CheckIcon className="h-4 w-4 text-emerald-400" />
                          <span>Buyer Approved ✓</span>
                        </>
                      ) : (
                        <>
                          <span>🏢</span>
                          <span>Mark as Done (Buyer)</span>
                        </>
                      )}
                    </button>

                    {/* Seller Button */}
                    <button
                      onClick={() => dispatch({ type: DEAL_ACTIONS.APPROVE_SELLER })}
                      disabled={dealState.sellerApproved}
                      className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-xs font-bold transition shadow-sm ${
                        dealState.sellerApproved
                          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                          : "border-white/15 bg-ink-800 text-white hover:border-accent/40 hover:bg-ink-700"
                      }`}
                    >
                      {dealState.sellerApproved ? (
                        <>
                          <CheckIcon className="h-4 w-4 text-emerald-400" />
                          <span>Seller Approved ✓</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Mark as Done (Seller)</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

            {/* Completed Success Celebration Screen */}
            {dealState.status === DEAL_STATES.COMPLETED && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-5 rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 via-ink-900 to-ink-950 p-6 text-center shadow-2xl relative overflow-hidden"
              >
                {/* Radiant sweep pulse */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.4, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="pointer-events-none absolute inset-0 bg-radial from-emerald-400/20 to-transparent"
                />

                <div className="text-4xl">🎉</div>
                <h3 className="mt-2 text-lg font-extrabold text-white sm:text-xl">
                  Funds Released & SBT Minted!
                </h3>
                <p className="mt-1 text-xs text-emerald-300">
                  {dealState.agreedPrice?.toLocaleString()} {gig.currency} has been released from GigEscrow.sol.
                </p>

                {/* Soulbound Token Preview with Shine Animation */}
                <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-ink-900/80 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    On-Chain Reputation Minted (ReputationSBT.sol)
                  </span>
                  <SBTBadge
                    tier={dealState.completedDeal?.sbtMinted?.tier || "Gold"}
                    count={1}
                    shine={true}
                    size="lg"
                  />
                  <span className="mt-2 text-[11px] font-mono text-zinc-500">
                    Token ID: {dealState.completedDeal?.sbtMinted?.tokenId} · Soulbound ERC-5192 (Non-Transferable)
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={onViewProfile}
                    className="w-full sm:w-auto rounded-full bg-accent px-6 py-2.5 text-xs font-bold text-white transition hover:bg-accent-soft shadow-lg shadow-accent/25"
                  >
                    View in Profile 👤
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto rounded-full border border-white/10 bg-ink-800 px-5 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-ink-700 hover:text-white"
                  >
                    Continue Swiping →
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
