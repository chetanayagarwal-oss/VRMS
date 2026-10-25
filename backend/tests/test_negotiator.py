"""
backend/tests/test_negotiator.py
────────────────────────────────
Unit and behavioral tests for the multi-agent negotiation engine.

Verifies:
1. Overlap gives a deal (agreed status and midpoint price)
2. No overlap gives no_deal
3. An offer never goes outside either limit (buyer <= buyer_max, seller >= seller_min)
4. The buyer's limit never appears in seller messages or seller system prompt
5. Mock/Fake LLM injection via interface
"""

import pytest
from langchain_core.messages import AIMessage
from models import Gig, BuyerInfo, NegotiationStatus
from negotiator import NegotiationSession, clamp_buyer_offer, clamp_seller_offer


class FakeLLM:
    """Mock LLM returning predefined responses with embedded numbers."""
    def __init__(self, responses: list[str] | None = None):
        self.responses = responses or [
            "We propose $1900 USDC for this project.",
            "I can do the work for $2300 USDC.",
            "How about $2050 USDC?",
            "I could accept $2150 USDC.",
        ]
        self.call_count = 0

    def invoke(self, messages, **kwargs):
        resp = self.responses[self.call_count % len(self.responses)]
        self.call_count += 1
        return AIMessage(content=resp)


@pytest.fixture
def sample_gig():
    return Gig(
        id="gig-test-01",
        title="Senior Smart Contract Auditor",
        category="Security",
        description="Comprehensive security audit of a DeFi staking protocol.",
        budget=2500.0,  # Buyer max is 2500 USDC
        currency="USDC",
        timeline="1 week",
        skills=["Solidity", "Foundry", "Security"],
        buyer=BuyerInfo(name="Test DAO", verified=True, rating=5.0, jobs=10),
    )


def test_overlap_gives_a_deal(sample_gig):
    """When seller_min <= buyer_max, ranges overlap, resulting in AGREED status at midpoint."""
    seller_min = 1800.0
    seller_max = 2400.0
    buyer_max = sample_gig.budget  # 2500.0

    session = NegotiationSession(
        gig=sample_gig,
        seller_min=seller_min,
        seller_max=seller_max,
        buyer_max=buyer_max,
        llm=FakeLLM(),
    )

    result = session.run_sync("neg-test-overlap")

    assert result.status == NegotiationStatus.AGREED
    assert result.agreed_price is not None

    # Midpoint rule: (1800 + 2500) / 2 = 2150.0
    expected_midpoint = round((seller_min + buyer_max) / 2.0, 2)
    assert result.agreed_price == expected_midpoint
    assert seller_min <= result.agreed_price <= buyer_max


def test_no_overlap_gives_no_deal(sample_gig):
    """When seller_min > buyer_max, ranges do not overlap, resulting in NO_DEAL."""
    seller_min = 3200.0  # Higher than buyer's max of 2500
    seller_max = 3800.0
    buyer_max = sample_gig.budget  # 2500.0

    session = NegotiationSession(
        gig=sample_gig,
        seller_min=seller_min,
        seller_max=seller_max,
        buyer_max=buyer_max,
        llm=FakeLLM(),
    )

    result = session.run_sync("neg-test-no-overlap")

    assert result.status == NegotiationStatus.NO_DEAL
    assert result.agreed_price is None
    assert "No budget overlap" in result.reason


def test_offers_never_go_outside_either_limit(sample_gig):
    """
    Every buyer offer must be <= buyer_max.
    Every seller offer must be >= seller_min.
    Even if the LLM attempts to output extreme or out-of-bound numbers.
    """
    seller_min = 1500.0
    seller_max = 2800.0
    buyer_max = 2400.0

    # Evil LLM attempting to offer 99999 for buyer and 10 for seller
    wild_llm = FakeLLM([
        "Buyer offers $99999 USDC right away!",
        "Seller will work for $10 USDC!",
        "Buyer now offers $50000 USDC!",
        "Seller will work for $50 USDC!",
    ])

    session = NegotiationSession(
        gig=sample_gig,
        seller_min=seller_min,
        seller_max=seller_max,
        buyer_max=buyer_max,
        llm=wild_llm,
    )

    result = session.run_sync("neg-test-bounds")

    assert len(result.messages) > 0
    for msg in result.messages:
        if msg.role == "buyer":
            assert msg.offer <= buyer_max, f"Buyer offer {msg.offer} exceeded buyer_max {buyer_max}"
        elif msg.role == "seller":
            assert msg.offer >= seller_min, f"Seller offer {msg.offer} was below seller_min {seller_min}"


def test_buyer_limit_never_appears_in_seller_messages_or_prompt(sample_gig):
    """
    Strict privacy test:
    The seller's prompt and dialogue history must NEVER contain the buyer's private limit.
    """
    secret_buyer_max = 3456.78
    seller_min = 1000.0
    seller_max = 2000.0

    session = NegotiationSession(
        gig=sample_gig,
        seller_min=seller_min,
        seller_max=seller_max,
        buyer_max=secret_buyer_max,
        llm=FakeLLM(),
    )

    session.run_sync("neg-test-privacy")

    # Check seller's system prompt
    assert str(secret_buyer_max) not in session.seller_system_prompt
    assert "3456" not in session.seller_system_prompt

    # Check all messages visible in seller_dialogue
    for m in session.seller_dialogue:
        content = str(getattr(m, "content", ""))
        assert str(secret_buyer_max) not in content, f"Secret buyer max leaked to seller: {content}"
        assert "3456" not in content


def test_clamping_functions_directly():
    """Directly test math clamping functions."""
    # Buyer clamping
    assert clamp_buyer_offer(3000.0, buyer_max=2000.0, round_idx=1) == 2000.0
    assert clamp_buyer_offer(1500.0, buyer_max=2000.0, round_idx=1) == 1500.0
    assert clamp_buyer_offer(None, buyer_max=2000.0, round_idx=1) <= 2000.0

    # Seller clamping
    assert clamp_seller_offer(800.0, seller_min=1200.0, seller_max=1800.0, round_idx=1) == 1200.0
    assert clamp_seller_offer(1600.0, seller_min=1200.0, seller_max=1800.0, round_idx=1) == 1600.0
    assert clamp_seller_offer(None, seller_min=1200.0, seller_max=1800.0, round_idx=1) >= 1200.0
