"""
backend/negotiator.py
─────────────────────
Multi-agent negotiation engine for SwipeGig.

Rules & Invariants:
1. Buyer Agent knows ONLY buyer_max (gig.budget). Never sees seller_min.
2. Seller Agent knows ONLY seller_min and seller_max. Never sees buyer_max.
3. Neither party's private thresholds appear in the other party's prompts or messages.
4. Up to 6 rounds of offers (3 turns each: buyer → seller → buyer ...).
5. Deal rule enforced in code:
   - If seller_min <= buyer_max (overlap): agree at the midpoint ((seller_min + buyer_max) / 2).
   - If seller_min > buyer_max (no overlap): status is NO_DEAL, agreed_price is None.
   - All offer numbers are strictly bounded to never exceed buyer_max or drop below seller_min.
"""

from __future__ import annotations
import asyncio
from typing import AsyncGenerator, Iterator, Any
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from models import Offer, NegotiationResult, NegotiationStatus, Gig
from llm_interface import build_llm, parse_offer


def build_buyer_system_prompt(gig: Gig, buyer_max: float) -> str:
    return (
        f"You are BUYER AI, representing the client hiring for '{gig.title}'.\n"
        f"Project Description: {gig.description}\n"
        f"Required Skills: {', '.join(gig.skills)}\n"
        f"YOUR STRICT PRIVATE MAXIMUM BUDGET: {buyer_max:.0f} USDC.\n"
        f"Under no circumstance may you offer or agree to any amount above {buyer_max:.0f} USDC.\n"
        f"Start by making a reasonable initial offer below your maximum, and negotiate politely.\n"
        f"Keep your response concise (1-2 sentences) and include your numerical offer in USDC."
    )


def build_seller_system_prompt(gig: Gig, seller_min: float, seller_max: float) -> str:
    return (
        f"You are SELLER AI, representing a top freelance professional for '{gig.title}'.\n"
        f"Project Description: {gig.description}\n"
        f"YOUR STRICT PRIVATE MINIMUM RATE: {seller_min:.0f} USDC. Target: {seller_max:.0f} USDC.\n"
        f"Under no circumstance may you accept or propose any rate below {seller_min:.0f} USDC.\n"
        f"Highlight quality, expertise, and propose a fair counter-offer.\n"
        f"Keep your response concise (1-2 sentences) and include your numerical offer in USDC."
    )


def clamp_buyer_offer(offer_val: float | None, buyer_max: float, round_idx: int) -> float:
    """Ensure buyer offer never exceeds buyer_max."""
    if offer_val is None or offer_val <= 0:
        # Graceful progression towards buyer_max
        factor = 0.75 + (0.07 * (round_idx - 1))
        return round(min(buyer_max * factor, buyer_max), 2)
    return round(min(offer_val, buyer_max), 2)


def clamp_seller_offer(offer_val: float | None, seller_min: float, seller_max: float, round_idx: int) -> float:
    """Ensure seller offer never drops below seller_min."""
    if offer_val is None or offer_val <= 0:
        # Graceful progression towards seller_min from target seller_max
        factor = 1.0 - (0.06 * (round_idx - 1))
        est = max(seller_max * factor, seller_min)
        return round(est, 2)
    return round(max(offer_val, seller_min), 2)


class NegotiationSession:
    def __init__(
        self,
        gig: Gig,
        seller_min: float,
        seller_max: float,
        buyer_max: float | None = None,
        max_rounds: int = 6,
        llm: Any | None = None,
    ):
        self.gig = gig
        self.seller_min = float(seller_min)
        self.seller_max = float(seller_max)
        self.buyer_max = float(buyer_max if buyer_max is not None else gig.budget)
        self.max_rounds = max(2, min(max_rounds, 6))
        self.llm = build_llm(override=llm)

        # Prompts are isolated:
        self.buyer_system_prompt = build_buyer_system_prompt(gig, self.buyer_max)
        self.seller_system_prompt = build_seller_system_prompt(gig, self.seller_min, self.seller_max)

        # Separate conversation histories for strict context isolation
        self.buyer_dialogue: list[Any] = [SystemMessage(content=self.buyer_system_prompt)]
        self.seller_dialogue: list[Any] = [SystemMessage(content=self.seller_system_prompt)]

        self.messages: list[Offer] = []
        self.has_overlap = self.seller_min <= self.buyer_max

    def _call_agent(self, role: str, round_idx: int) -> tuple[float, str]:
        is_buyer = role == "buyer"

        if is_buyer:
            dialogue = self.buyer_dialogue
            sys_prompt = self.buyer_system_prompt
        else:
            dialogue = self.seller_dialogue
            sys_prompt = self.seller_system_prompt

        try:
            resp = self.llm.invoke(dialogue)
            text = resp.content if hasattr(resp, "content") else str(resp)
        except Exception:
            # Fallback text if LLM call encounters any provider issues
            if is_buyer:
                offer_val = clamp_buyer_offer(None, self.buyer_max, round_idx)
                text = f"We can propose ${offer_val:.0f} USDC for the complete scope."
            else:
                offer_val = clamp_seller_offer(None, self.seller_min, self.seller_max, round_idx)
                text = f"Based on requirements, our counter-offer is ${offer_val:.0f} USDC."

        raw_price = parse_offer(text)

        if is_buyer:
            final_price = clamp_buyer_offer(raw_price, self.buyer_max, round_idx)
            # Ensure price appears in text
            if f"${final_price:.0f}" not in text and str(int(final_price)) not in text:
                text = f"{text.strip()} (Offer: ${final_price:.0f} USDC)"
        else:
            final_price = clamp_seller_offer(raw_price, self.seller_min, self.seller_max, round_idx)
            if f"${final_price:.0f}" not in text and str(int(final_price)) not in text:
                text = f"{text.strip()} (Offer: ${final_price:.0f} USDC)"

        return final_price, text

    def step(self, round_idx: int, role: str) -> Offer:
        price, text = self._call_agent(role, round_idx)
        offer = Offer(round=round_idx, role=role, offer=price, text=text)
        self.messages.append(offer)

        # Cross-feed messages without leaking system prompts or private budgets
        if role == "buyer":
            self.buyer_dialogue.append(AIMessage(content=text))
            self.seller_dialogue.append(HumanMessage(content=f"Buyer AI offers: {text}"))
        else:
            self.seller_dialogue.append(AIMessage(content=text))
            self.buyer_dialogue.append(HumanMessage(content=f"Seller AI counters: {text}"))

        return offer

    def finalize(self, negotiation_id: str) -> NegotiationResult:
        """
        Enforce deal rule in code:
        - Overlap -> agree at the midpoint of the private ranges ((seller_min + buyer_max) / 2)
        - No overlap -> no_deal
        """
        if self.has_overlap:
            agreed_price = round((self.seller_min + self.buyer_max) / 2.0, 2)
            # Final validation: must be within [seller_min, buyer_max]
            agreed_price = max(self.seller_min, min(self.buyer_max, agreed_price))
            return NegotiationResult(
                negotiation_id=negotiation_id,
                status=NegotiationStatus.AGREED,
                agreed_price=agreed_price,
                reason="Budget ranges overlap; deal finalized at midpoint.",
                messages=self.messages,
            )
        else:
            return NegotiationResult(
                negotiation_id=negotiation_id,
                status=NegotiationStatus.NO_DEAL,
                agreed_price=None,
                reason=f"No budget overlap. Seller minimum ({self.seller_min:.0f} USDC) exceeds buyer maximum ({self.buyer_max:.0f} USDC).",
                messages=self.messages,
            )

    async def run_async(self, negotiation_id: str, delay_between_rounds: float = 0.6) -> AsyncGenerator[Offer, None]:
        """Async generator that yields each offer with a realistic typing delay."""
        turns = [
            (1, "buyer"),
            (1, "seller"),
            (2, "buyer"),
            (2, "seller"),
            (3, "buyer"),
            (3, "seller"),
        ][: self.max_rounds]

        for round_idx, role in turns:
            offer = self.step(round_idx, role)
            yield offer
            if delay_between_rounds > 0:
                await asyncio.sleep(delay_between_rounds)

    def run_sync(self, negotiation_id: str) -> NegotiationResult:
        """Synchronous full run for testing."""
        turns = [
            (1, "buyer"),
            (1, "seller"),
            (2, "buyer"),
            (2, "seller"),
            (3, "buyer"),
            (3, "seller"),
        ][: self.max_rounds]

        for round_idx, role in turns:
            self.step(round_idx, role)

        return self.finalize(negotiation_id)
