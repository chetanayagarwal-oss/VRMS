"""
backend/models.py – Pydantic data models for SwipeGig API with strict validation
"""

from __future__ import annotations
from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, model_validator


# ── Base Model with extra="forbid" to reject unknown fields ───────────────────

class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ── Authentication models ───────────────────────────────────────────────────

class UserRegisterRequest(StrictBaseModel):
    email: str = Field(..., min_length=3, max_length=120, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(..., min_length=8, max_length=128, description="Plaintext password to be bcrypt hashed")


class UserLoginRequest(StrictBaseModel):
    email: str = Field(..., min_length=3, max_length=120)
    password: str = Field(..., min_length=1, max_length=128)


class RefreshTokenRequest(StrictBaseModel):
    refresh_token: str = Field(..., min_length=10, max_length=1000)


class TokenResponse(StrictBaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900  # 15 minutes


class UserResponse(StrictBaseModel):
    id: str
    email: str


# ── Gig models ─────────────────────────────────────────────────────────────

class BuyerInfo(StrictBaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    verified: bool = True
    rating: float = Field(..., ge=0.0, le=5.0)
    jobs: int = Field(..., ge=0, le=1_000_000)
    sbt: dict[str, Any] | None = None


class Gig(StrictBaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    title: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=5000)
    budget: float = Field(..., gt=0, le=10_000_000, description="Headline budget in currency")
    currency: str = Field(default="USDC", min_length=1, max_length=10)
    timeline: str = Field(..., min_length=1, max_length=100)
    skills: list[str] = Field(..., min_length=1, max_length=50)
    buyer: BuyerInfo
    gradient: str = Field(default="", max_length=200)


class GigCreateRequest(StrictBaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=5000)
    budget: float = Field(..., gt=0, le=10_000_000)
    currency: str = Field(default="USDC", min_length=1, max_length=10)
    timeline: str = Field(..., min_length=1, max_length=100)
    skills: list[str] = Field(..., min_length=1, max_length=50)
    gradient: str = Field(default="", max_length=200)


# ── Budget Settings & Negotiation models ────────────────────────────────────

class UserBudgetSettings(StrictBaseModel):
    min_budget: float = Field(..., gt=0, le=1_000_000)
    max_budget: float = Field(..., gt=0, le=1_000_000)

    @model_validator(mode="after")
    def validate_budget_range(self) -> UserBudgetSettings:
        if self.min_budget > self.max_budget:
            raise ValueError("min_budget must be less than or equal to max_budget")
        return self


class NegotiationStatus(str, Enum):
    PENDING = "pending"
    AGREED  = "agreed"
    NO_DEAL = "no_deal"


class NegotiationRequest(StrictBaseModel):
    gig_id: str = Field(..., min_length=1, max_length=64)
    user_id: str = Field(default="user-anon", min_length=1, max_length=100)
    min_budget: float = Field(..., gt=0, le=1_000_000, description="Seller's private minimum (USDC)")
    max_budget: float = Field(..., gt=0, le=1_000_000, description="Seller's private maximum target (USDC)")

    @model_validator(mode="after")
    def validate_budget_range(self) -> NegotiationRequest:
        if self.min_budget > self.max_budget:
            raise ValueError("min_budget must be less than or equal to max_budget")
        return self


class NegotiationStarted(StrictBaseModel):
    negotiation_id: str
    gig_id: str
    status: NegotiationStatus = NegotiationStatus.PENDING


class Offer(StrictBaseModel):
    round: int
    role: str        # "buyer" | "seller"
    offer: float | None
    text: str


class NegotiationResult(StrictBaseModel):
    negotiation_id: str
    status: NegotiationStatus
    agreed_price: float | None = None
    reason: str | None = None
    messages: list[Offer] = []
