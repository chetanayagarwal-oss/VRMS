// Mock gigs for testing the swipe feed.
// budget is the buyer's *public* headline budget (hidden min/max thresholds come in Part 3).
export const MOCK_GIGS = [
  {
    id: "gig-001",
    title: "Senior React Developer for DeFi Dashboard",
    category: "Development",
    description:
      "Build a real-time portfolio dashboard with wallet connect, charts and transaction history. Clean component architecture and strong TypeScript required.",
    budget: 2400,
    currency: "USDC",
    timeline: "3 weeks",
    skills: ["React", "TypeScript", "Ethers.js", "Tailwind"],
    buyer: {
      name: "Aether Labs",
      verified: true,
      rating: 4.9,
      jobs: 37,
      sbt: { count: 12, tier: "Gold" },
    },
    gradient: "from-violet-600/30 via-indigo-600/10 to-transparent",
  },
  {
    id: "gig-002",
    title: "Brand Identity & Logo System for Fintech Startup",
    category: "Design",
    description:
      "Complete identity: logo, color system, typography and a compact brand guideline. Modern, trustworthy and minimal.",
    budget: 1800,
    currency: "USDC",
    timeline: "2 weeks",
    skills: ["Branding", "Figma", "Illustration"],
    buyer: {
      name: "Northwind Pay",
      verified: true,
      rating: 4.7,
      jobs: 12,
      sbt: { count: 5, tier: "Silver" },
    },
    gradient: "from-fuchsia-600/30 via-pink-600/10 to-transparent",
  },
  {
    id: "gig-003",
    title: "Smart Contract Audit: ERC-721 Marketplace",
    category: "Security",
    description:
      "Review a Solidity marketplace contract for reentrancy, access control and gas issues. Deliver a written report with severity ratings and fixes.",
    budget: 3600,
    currency: "USDC",
    timeline: "10 days",
    skills: ["Solidity", "Foundry", "Security", "Slither"],
    buyer: {
      name: "Marlin DAO",
      verified: true,
      rating: 5.0,
      jobs: 21,
      sbt: { count: 21, tier: "Platinum" },
    },
    gradient: "from-emerald-500/30 via-teal-600/10 to-transparent",
  },
  {
    id: "gig-004",
    title: "Technical Blog Series on Account Abstraction",
    category: "Writing",
    description:
      "Write four in-depth articles explaining ERC-4337 for developers, with diagrams and runnable code samples.",
    budget: 950,
    currency: "USDC",
    timeline: "2 weeks",
    skills: ["Technical Writing", "Web3", "SEO"],
    buyer: {
      name: "Cipher Weekly",
      verified: false,
      rating: 4.5,
      jobs: 6,
      sbt: { count: 1, tier: "Bronze" },
    },
    gradient: "from-amber-500/30 via-orange-600/10 to-transparent",
  },
];
