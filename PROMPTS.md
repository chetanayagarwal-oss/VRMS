# SwipeGig – Build Prompts (in parts)

Use these one at a time. Paste the shared context first in every new chat.

## Shared Context (paste before every part)

You are an expert Full-Stack Web3, AI and Frontend developer building the MVP of **SwipeGig**: a freelance/gig marketplace that replaces resumes and cover letters with a Tinder-style swipe interface, AI-agent negotiation, and Web3 escrow.

- Swipe right on a gig -> each side's personal AI agent negotiates price/terms in the background using hidden min/max budget parameters (no direct messaging).
- When a deal is struck, payment is locked in a smart-contract escrow.
- Funds release to the worker's wallet when both parties mark the job done.
- The worker is then minted a Soulbound Token (SBT) as on-chain reputation.

Stack: React + Tailwind + Framer Motion (frontend); Node.js or FastAPI (backend); LangChain or CrewAI with an LLM API (negotiation); Solidity + Ethers.js + ERC-4337 account abstraction with email login (Web3).
Design: modern, dark, minimalist, highly professional.

---

## Part 1 – Frontend foundation (DONE in this repo)

Create the React app structure with Tailwind layout and a Framer Motion swipe-card feed. Show 3-4 mock gig cards (title, budget, timeline) so the swipe animations can be tested immediately. Dark minimalist UI.

## Part 2 – Negotiation modal + escrow + completion UI (mocked)

On swipe right, open a modal with a simulated chat between "Buyer AI" and "Seller AI" that converges on a price inside user-defined min/max thresholds (add a small settings panel for those thresholds). After the deal, show a "Locked in Escrow" state with simulated transaction progress (pending -> confirmed, fake tx hash). Add a "Mark as Done" button for each party; when both are clicked, show funds transferred to the seller and a shiny Soulbound Token badge on their profile page. All state transitions should be driven by one small state machine (idle -> negotiating -> escrowed -> completed).

## Part 3 – Backend + real AI negotiation

Build a FastAPI (or Node) service with endpoints for gigs, users and negotiations. Implement two LangChain/CrewAI agents (Buyer and Seller) that exchange offers over several rounds, each with a private budget range that is never revealed to the other agent. Stream the conversation to the frontend (SSE or WebSocket). Return the final agreed price or a "no deal" outcome.

## Part 4 – Smart contracts

Write Solidity contracts with Foundry/Hardhat tests:
1. `GigEscrow` – deposit, both-party completion approval, release, refund/dispute timeout, reentrancy protection.
2. `ReputationSBT` – non-transferable ERC-721 (or ERC-5192) minted on successful payout, with job metadata.
Include deployment scripts for a testnet.

## Part 5 – Web3 wiring + account abstraction

Connect the frontend to the contracts with Ethers.js. Add email login using ERC-4337 smart accounts (e.g. via a provider such as Biconomy, Alchemy Account Kit, or ZeroDev), with gas sponsorship. Replace the mocked escrow and SBT states with real testnet transactions.

## Part 6 – Hardening & launch prep

Auth, input validation, rate limiting, error states, loading skeletons, mobile polish, basic analytics, a security review of the contracts, and a deployment guide.
