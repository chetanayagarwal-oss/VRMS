"""
backend/models.py – Pydantic data models for SwipeGig API
"""

from __future__ import annotations
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


# ── Gig models ─────────────────────────────────────────────────────────────

class BuyerInfo(BaseModel):
    name: str
    verified: bool
    rating: float
    jobs: int
    sbt: dict[str, Any] | None = None


class Gig(BaseModel):
    id: str
    title: str
    category: str
    description: str
    budget: float          # buyer's *public* headline budget (USDC)
    currency: str = "USDC"
    timeline: str
    skills: list[str]
    buyer: BuyerInfo
    gradient: str = ""


# ── Negotiation models ─────────────────────────────────────────────────────

class NegotiationStatus(str, Enum):
    PENDING = "pending"
    AGREED  = "agreed"
    NO_DEAL = "no_deal"


class NegotiationRequest(BaseModel):
    gig_id: str
    user_id: str = "user-anon"
    min_budget: float = Field(..., gt=0, description="Seller's private minimum (USDC)")
    max_budget: float = Field(..., gt=0, description="Seller's private maximum target (USDC)")


class NegotiationStarted(BaseModel):
    negotiation_id: str
    gig_id: str
    status: NegotiationStatus = NegotiationStatus.PENDING


class Offer(BaseModel):
    round: int
    role: str        # "buyer" | "seller"
    offer: float | None
    text: str


class NegotiationResult(BaseModel):
    negotiation_id: str
    status: NegotiationStatus
    agreed_price: float | None = None
    reason: str | None = None
    messages: list[Offer] = []
