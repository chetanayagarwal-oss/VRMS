"""
backend/main.py
───────────────
FastAPI service for SwipeGig:
- GET  /gigs                   -> Returns active gigs list from gigs.json
- POST /negotiations           -> Initiates an AI negotiation session
- GET  /negotiations/{id}/stream -> Real-time SSE stream of negotiation rounds
- GET  /negotiations/{id}      -> Retrieves the finalized negotiation result
"""

from __future__ import annotations
import json
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from models import (
    Gig,
    NegotiationRequest,
    NegotiationStarted,
    NegotiationResult,
    NegotiationStatus,
    Offer,
)
from negotiator import NegotiationSession
from config import settings

app = FastAPI(
    title="SwipeGig API",
    description="Backend service powering Tinder-style gig swiping and AI agent negotiation.",
    version="1.0.0",
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load gigs data from backend/data/gigs.json
DATA_FILE = Path(__file__).parent / "data" / "gigs.json"
GIGS_CACHE: dict[str, Gig] = {}


def load_gigs() -> list[Gig]:
    if not DATA_FILE.exists():
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        raw_list = json.load(f)
        gigs = [Gig(**item) for item in raw_list]
        for g in gigs:
            GIGS_CACHE[g.id] = g
        return gigs


# In-memory stores for MVP
SESSIONS: dict[str, NegotiationSession] = {}
RESULTS: dict[str, NegotiationResult] = {}
STREAM_QUEUES: dict[str, list[dict[str, Any]]] = {}


@app.on_event("startup")
async def startup_event():
    load_gigs()


@app.get("/health")
def health_check():
    return {"status": "ok", "gigs_loaded": len(GIGS_CACHE)}


@app.get("/gigs", response_model=list[Gig])
def get_gigs():
    """Return all available freelance gigs."""
    if not GIGS_CACHE:
        load_gigs()
    return list(GIGS_CACHE.values())


@app.get("/gigs/{gig_id}", response_model=Gig)
def get_gig(gig_id: str):
    if not GIGS_CACHE:
        load_gigs()
    if gig_id not in GIGS_CACHE:
        raise HTTPException(status_code=404, detail="Gig not found")
    return GIGS_CACHE[gig_id]


@app.post("/negotiations", response_model=NegotiationStarted, status_code=status.HTTP_201_CREATED)
def start_negotiation(req: NegotiationRequest):
    """
    Start a background multi-agent negotiation.
    - gig_id: ID of the gig swiped right on
    - min_budget: Seller's private floor (hidden from Buyer AI)
    - max_budget: Seller's target goal
    """
    if not GIGS_CACHE:
        load_gigs()

    if req.gig_id not in GIGS_CACHE:
        raise HTTPException(status_code=404, detail=f"Gig '{req.gig_id}' not found")

    gig = GIGS_CACHE[req.gig_id]
    negotiation_id = f"neg-{uuid.uuid4().hex[:10]}"

    session = NegotiationSession(
        gig=gig,
        seller_min=req.min_budget,
        seller_max=req.max_budget,
        buyer_max=gig.budget,
        max_rounds=settings.max_rounds,
    )

    SESSIONS[negotiation_id] = session
    STREAM_QUEUES[negotiation_id] = []

    return NegotiationStarted(
        negotiation_id=negotiation_id,
        gig_id=req.gig_id,
        status=NegotiationStatus.PENDING,
    )


@app.get("/negotiations/{negotiation_id}/stream")
async def stream_negotiation(negotiation_id: str):
    """
    Server-Sent Events (SSE) stream emitting real-time negotiation offers.
    Yields events with format: { "round": int, "role": "buyer"|"seller", "offer": float, "text": str }
    Followed by completion event: { "done": true, "status": "agreed"|"no_deal", "price": float|None }
    """
    if negotiation_id not in SESSIONS and negotiation_id not in RESULTS:
        raise HTTPException(status_code=404, detail="Negotiation session not found")

    async def event_generator():
        # If already completed previously, stream back the history and result
        if negotiation_id in RESULTS:
            res = RESULTS[negotiation_id]
            for msg in res.messages:
                yield {
                    "event": "message",
                    "data": json.dumps(msg.model_dump()),
                }
            yield {
                "event": "done",
                "data": json.dumps({
                    "done": True,
                    "status": res.status.value,
                    "price": res.agreed_price,
                    "reason": res.reason,
                }),
            }
            return

        session = SESSIONS[negotiation_id]

        async for offer in session.run_async(negotiation_id, delay_between_rounds=0.5):
            payload = offer.model_dump()
            STREAM_QUEUES[negotiation_id].append(payload)
            yield {
                "event": "message",
                "data": json.dumps(payload),
            }

        result = session.finalize(negotiation_id)
        RESULTS[negotiation_id] = result

        yield {
            "event": "done",
            "data": json.dumps({
                "done": True,
                "status": result.status.value,
                "price": result.agreed_price,
                "reason": result.reason,
            }),
        }

    return EventSourceResponse(event_generator())


@app.get("/negotiations/{negotiation_id}", response_model=NegotiationResult)
def get_negotiation_result(negotiation_id: str):
    """Get the current or final outcome of a negotiation."""
    if negotiation_id in RESULTS:
        return RESULTS[negotiation_id]

    if negotiation_id in SESSIONS:
        # Finalize synchronously if stream hasn't been accessed yet
        session = SESSIONS[negotiation_id]
        if not session.messages:
            res = session.run_sync(negotiation_id)
        else:
            res = session.finalize(negotiation_id)
        RESULTS[negotiation_id] = res
        return res

    raise HTTPException(status_code=404, detail="Negotiation not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
