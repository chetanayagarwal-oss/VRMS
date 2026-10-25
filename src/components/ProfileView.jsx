import { useState } from "react";
import { motion } from "framer-motion";
import SBTBadge from "./SBTBadge.jsx";

export default function ProfileView({
  user = {
    name: "Alex Rivers",
    handle: "alexrivers.eth",
    role: "Full-Stack Web3 & AI Engineer",
    address: "0x742d...44e",
    rating: 4.95,
  },
  completedDeals = [],
  savedGigs = [],
  budget,
  onOpenSettings,
  onBackToFeed,
}) {
  const [activeTab, setActiveTab] = useState("reputation"); // "reputation" | "completed" | "saved"

  const totalEarned = completedDeals.reduce((acc, deal) => acc + (deal.amount || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.3 }}
      className="mx-auto w-full max-w-2xl px-4 py-6"
    >
      {/* Back to feed header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBackToFeed}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-900 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white"
        >
          ← Back to Swipe Feed
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-900 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white"
        >
          ⚙️ Agent Settings
        </button>
      </div>

      {/* User Identity Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/80 p-6 shadow-card backdrop-blur-xl sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent to-emerald-400 text-2xl font-black text-white shadow-lg shadow-accent/20">
              {user.name[0]}
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
                ✓
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white sm:text-2xl">{user.name}</h1>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-mono text-zinc-400">
                  {user.handle}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">{user.role}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded-md border border-white/5 bg-ink-950 px-2 py-0.5 font-mono text-[11px] text-zinc-500">
                  Smart Account: {user.address}
                </span>
                <span className="text-[11px] text-amber-400">★ {user.rating}</span>
              </div>
            </div>
          </div>

          {/* Quick hidden settings preview */}
          <div className="rounded-2xl border border-white/5 bg-ink-950/70 p-3 sm:text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Hidden AI Parameters
            </span>
            <div className="mt-1 font-mono text-xs text-zinc-300">
              Floor: <span className="text-emerald-400">${budget?.min}</span> · Target:{" "}
              <span className="text-accent-soft">${budget?.max}</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/5 pt-5 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/5 bg-ink-950/50 p-3 text-center">
            <div className="text-[11px] text-zinc-500">Total Earned</div>
            <div className="mt-1 font-mono text-lg font-bold text-emerald-400">
              ${totalEarned.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-ink-950/50 p-3 text-center">
            <div className="text-[11px] text-zinc-500">Deals Closed</div>
            <div className="mt-1 font-mono text-lg font-bold text-white">
              {completedDeals.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-ink-950/50 p-3 text-center">
            <div className="text-[11px] text-zinc-500">SBT Tokens</div>
            <div className="mt-1 font-mono text-lg font-bold text-accent-soft">
              {completedDeals.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-ink-950/50 p-3 text-center">
            <div className="text-[11px] text-zinc-500">Saved Gigs</div>
            <div className="mt-1 font-mono text-lg font-bold text-zinc-300">
              {savedGigs.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex border-b border-white/10">
        <button
          onClick={() => setActiveTab("reputation")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
            activeTab === "reputation"
              ? "border-accent text-accent-soft"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <span>🛡️ Soulbound Reputation</span>
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent-soft">
            {completedDeals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
            activeTab === "completed"
              ? "border-accent text-accent-soft"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <span>💼 Completed Deals</span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
            {completedDeals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
            activeTab === "saved"
              ? "border-accent text-accent-soft"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <span>❤️ Saved Gigs</span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
            {savedGigs.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Soulbound Reputation (SBTs with shine animation) */}
      {activeTab === "reputation" && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <p>
              Non-transferable ERC-5192 reputation tokens minted upon milestone escrow completion.
            </p>
          </div>

          {completedDeals.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-ink-900/40 p-8 text-center">
              <div className="text-3xl">🛡️</div>
              <h4 className="mt-2 text-sm font-bold text-white">No Soulbound Tokens yet</h4>
              <p className="mt-1 text-xs text-zinc-400">
                Complete a gig negotiation and sign off on escrow to mint your first on-chain proof
                of reputation.
              </p>
              <button
                onClick={onBackToFeed}
                className="mt-4 rounded-full bg-accent px-5 py-2 text-xs font-bold text-white transition hover:bg-accent-soft"
              >
                Explore Gigs
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {completedDeals.map((deal) => (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/80 p-5 shadow-lg backdrop-blur"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500">
                        {deal.sbtMinted?.tokenId}
                      </span>
                      <h4 className="mt-0.5 text-sm font-bold text-white line-clamp-1">
                        {deal.gig.title}
                      </h4>
                      <p className="text-xs text-zinc-400">Buyer: {deal.buyer?.name}</p>
                    </div>

                    {/* SBT Badge with Shine Animation */}
                    <SBTBadge
                      tier={deal.sbtMinted?.tier || "Gold"}
                      count={1}
                      shine={true}
                      size="sm"
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[11px]">
                    <span className="font-mono text-emerald-400 font-semibold">
                      +{deal.amount?.toLocaleString()} {deal.currency}
                    </span>
                    <span className="font-mono text-zinc-500 text-[10px] truncate max-w-[150px]">
                      {deal.txHash}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Completed Deals History */}
      {activeTab === "completed" && (
        <div className="mt-6 space-y-3">
          {completedDeals.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-ink-900/40 p-8 text-center text-xs text-zinc-400">
              No completed deals yet. Swipe right on a gig to trigger AI negotiation!
            </div>
          ) : (
            completedDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-ink-900/60 p-4"
              >
                <div>
                  <h4 className="text-sm font-semibold text-white">{deal.gig.title}</h4>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                    <span>Client: {deal.buyer?.name}</span>
                    <span>·</span>
                    <span className="font-mono text-[11px] text-zinc-500">{deal.txHash}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-base font-bold text-emerald-400">
                    ${deal.amount?.toLocaleString()}
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Paid Out
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Saved Gigs */}
      {activeTab === "saved" && (
        <div className="mt-6 space-y-3">
          {savedGigs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-ink-900/40 p-8 text-center text-xs text-zinc-400">
              No saved gigs yet. Swipe right on gigs you find interesting!
            </div>
          ) : (
            savedGigs.map((gig) => (
              <div
                key={gig.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-ink-900/60 p-4"
              >
                <div>
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                    {gig.category}
                  </span>
                  <h4 className="mt-1 text-sm font-semibold text-white">{gig.title}</h4>
                  <p className="text-xs text-zinc-400">Client: {gig.buyer.name} · ⏱ {gig.timeline}</p>
                </div>

                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-white">
                    {gig.budget.toLocaleString()} {gig.currency}
                  </div>
                  <span className="text-[10px] text-zinc-500">Public Budget</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
