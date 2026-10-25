import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GOOGLE_ICON = (
  <svg viewBox="0 0 48 48" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

const roles = [
  {
    id: "client",
    emoji: "??",
    title: "I'm a Client",
    subtitle: "Post gigs & hire talent",
    desc: "Swipe through skilled freelancers, let your AI agent negotiate the best price, and lock payment in a smart contract escrow.",
    gradient: "from-violet-600/20 to-indigo-600/20",
    border: "border-violet-500/40",
    glow: "shadow-violet-500/20",
    active: "border-violet-400 bg-violet-500/10",
    pill: "bg-violet-500/20 text-violet-300",
  },
  {
    id: "freelancer",
    emoji: "??",
    title: "I'm a Freelancer",
    subtitle: "Find work & get paid on-chain",
    desc: "Discover client gigs that match your skills, negotiate hands-free via AI, and earn Soulbound Tokens as verifiable reputation.",
    gradient: "from-cyan-600/20 to-teal-600/20",
    border: "border-cyan-500/40",
    glow: "shadow-cyan-500/20",
    active: "border-cyan-400 bg-cyan-500/10",
    pill: "bg-cyan-500/20 text-cyan-300",
  },
];

export default function LandingPage({ onEnter }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [step, setStep] = useState("role");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    setTimeout(() => {
      const mockUser = {
        name: "Vansh Rawat",
        email: "vansh@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=swipegig",
        role: selectedRole,
      };
      localStorage.setItem("sg_user", JSON.stringify(mockUser));
      localStorage.setItem("sg_role", selectedRole);
      setIsGoogleLoading(false);
      setDone(true);
      setTimeout(() => onEnter(mockUser, selectedRole), 900);
    }, 1400);
  };

  const handleSkip = () => {
    const guestUser = { name: "Guest", role: selectedRole, guest: true };
    localStorage.setItem("sg_role", selectedRole);
    onEnter(guestUser, selectedRole);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-auto bg-ink-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[80px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-cyan-600/15 blur-[80px]" />
      </div>

      <AnimatePresence mode="wait">
        {step === "role" && (
          <motion.div key="role" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.35 }} className="relative w-full max-w-lg">
            <div className="mb-8 text-center">
              <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 260 }} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-3xl shadow-2xl shadow-violet-500/30">
                ?
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">SwipeGig</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-2 text-sm text-zinc-400">
                The world's first AI-negotiated, Web3-secured freelance marketplace.
              </motion.p>
            </div>

            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">Choose your role to get started</p>

            <div className="grid gap-3 sm:grid-cols-2">
              {roles.map((r, i) => (
                <motion.button key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} onClick={() => setSelectedRole(r.id)} className={`group relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 ${selectedRole === r.id ? r.active + " shadow-xl " + r.glow : "border-white/10 bg-ink-900/60 hover:border-white/20 hover:bg-ink-800/60"}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${r.gradient} opacity-0 transition-opacity group-hover:opacity-100 ${selectedRole === r.id ? "!opacity-100" : ""}`} />
                  <div className="relative">
                    <div className="text-3xl">{r.emoji}</div>
                    <div className="mt-2 font-bold text-white">{r.title}</div>
                    <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.pill}`}>{r.subtitle}</div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">{r.desc}</p>
                  </div>
                  {selectedRole === r.id && (
                    <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white text-xs">?</div>
                  )}
                </motion.button>
              ))}
            </div>

            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} onClick={() => selectedRole && setStep("login")} disabled={!selectedRole} className={`mt-5 w-full rounded-full py-3.5 text-sm font-bold transition-all duration-200 ${selectedRole ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02]" : "cursor-not-allowed bg-ink-800 text-zinc-600"}`}>
              Continue ?
            </motion.button>
          </motion.div>
        )}

        {step === "login" && (
          <motion.div key="login" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.35 }} className="relative w-full max-w-sm">
            <button onClick={() => setStep("role")} className="mb-6 flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-white">? Back</button>

            <div className="rounded-3xl border border-white/10 bg-ink-900/80 p-8 shadow-2xl backdrop-blur-xl">
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-2xl">
                  {roles.find((r) => r.id === selectedRole)?.emoji}
                </div>
                <h2 className="text-xl font-bold text-white">
                  Sign in as a{" "}
                  <span className="capitalize bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">{selectedRole}</span>
                </h2>
                <p className="mt-1.5 text-xs text-zinc-400">Your data stays private. Payments secured by smart contracts.</p>
              </div>

              <div className="mt-7 space-y-3">
                <button onClick={handleGoogleLogin} disabled={isGoogleLoading || done} id="btn-google-login" className={`flex w-full items-center justify-center gap-3 rounded-full border py-3.5 text-sm font-semibold transition-all duration-200 ${done ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-white/15 bg-white text-zinc-800 hover:bg-zinc-100 hover:shadow-lg"}`}>
                  {isGoogleLoading ? (
                    <><svg className="h-4 w-4 animate-spin text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg><span className="text-zinc-600">Signing in…</span></>
                  ) : done ? (
                    <>? <span>Signed in — entering app…</span></>
                  ) : (
                    <>{GOOGLE_ICON}<span>Continue with Google</span></>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] font-medium text-zinc-600">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <button onClick={handleSkip} id="btn-skip-login" className="w-full rounded-full border border-white/10 py-3 text-xs font-semibold text-zinc-400 transition hover:border-white/20 hover:text-white">
                  Continue as Guest (no account)
                </button>
              </div>

              <div className="mt-6 flex justify-center gap-4 text-[10px] text-zinc-600">
                <span>?? Zero-knowledge budget</span>
                <span>? On-chain escrow</span>
                <span>?? SBT reputation</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
