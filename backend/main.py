"""
backend/main.py
───────────────
Hardened FastAPI service for SwipeGig:
- Structured JSON logging (request_id, route, status, latency; no sensitive data)
- Slowapi rate limiting (5/min for auth, 10/min for negotiations) with Retry-After header
- Strict CORS without "*"
- JWT Authentication with bcrypt password hashing
- Protected negotiation and gig write endpoints returning 401 on missing/invalid token
- Strict Pydantic input validation (extra="forbid", bounds, min <= max)
"""

import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sse_starlette.sse import EventSourceResponse

from auth import (
    USERS_DB,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from config import settings
from models import (
    BuyerInfo,
    Gig,
    GigCreateRequest,
    NegotiationRequest,
    NegotiationResult,
    NegotiationStarted,
    NegotiationStatus,
    RefreshTokenRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from negotiator import NegotiationSession

# ── Structured JSON Logger Setup ─────────────────────────────────────────────

logger = logging.getLogger("swipegig.access")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    logger.addHandler(ch)


# ── Rate Limiter Setup ───────────────────────────────────────────────────────

def get_user_or_ip(request: Request) -> str:
    """Extract authenticated user identifier or fallback to remote client IP."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token, expected_type="access")
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass
    return get_remote_address(request) or "ip:unknown"


limiter = Limiter(key_func=get_remote_address)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """Return 429 Too Many Requests with explicit Retry-After header."""
    # exc.detail or calculate retry window
    retry_after = getattr(exc, "retry_after", None)
    if retry_after is None:
        retry_after = 60
    retry_after_int = max(1, int(retry_after))

    resp = JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}",
            "retry_after": retry_after_int,
        },
    )
    resp.headers["Retry-After"] = str(retry_after_int)
    return resp


# ── Lifespan & App Setup ─────────────────────────────────────────────────────

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_gigs()
    yield


app = FastAPI(
    title="SwipeGig API",
    description="Hardened backend powering Tinder-style gig swiping, JWT auth, and AI negotiation.",
    version="1.1.0",
    lifespan=lifespan,
)

# Attach limiter to app state and register 429 handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


# ── Structured JSON Access Logging Middleware ─────────────────────────────────

@app.middleware("http")
async def structured_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or f"req-{uuid.uuid4().hex[:12]}"
    t0 = time.perf_counter()

    response = await call_next(request)

    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    # Structured JSON log without passwords, tokens, or budget parameters
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request_id": request_id,
        "method": request.method,
        "route": request.url.path,
        "status": response.status_code,
        "latency_ms": latency_ms,
    }
    logger.info(json.dumps(log_entry))

    response.headers["X-Request-ID"] = request_id
    return response


# ── Strict CORS Middleware (No "*") ──────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# In-memory stores for MVP
SESSIONS: dict[str, NegotiationSession] = {}
RESULTS: dict[str, NegotiationResult] = {}
STREAM_QUEUES: dict[str, list[dict[str, Any]]] = {}


# ── Health & Diagnostics ─────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "gigs_loaded": len(GIGS_CACHE)}


# ── Authentication Endpoints (Rate Limited to 5/min per IP) ─────────────────

@app.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register_user(request: Request, body: UserRegisterRequest):
    """
    Register a new user with bcrypt-hashed password.
    Returns 15-minute access token and 7-day refresh token.
    """
    email_clean = body.email.strip().lower()
    if email_clean in USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    user_id = f"user-{uuid.uuid4().hex[:10]}"
    hashed = hash_password(body.password)

    user_record = {
        "id": user_id,
        "email": email_clean,
        "password_hash": hashed,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    USERS_DB[email_clean] = user_record

    token_data = {"sub": email_clean, "uid": user_id}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@app.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login_user(request: Request, body: UserLoginRequest):
    """
    Authenticate user via email and password using bcrypt.
    Returns 15-minute access token and 7-day refresh token.
    """
    email_clean = body.email.strip().lower()
    user_record = USERS_DB.get(email_clean)

    if not user_record or not verify_password(body.password, user_record["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {"sub": email_clean, "uid": user_record["id"]}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@app.post("/auth/refresh", response_model=TokenResponse)
@limiter.limit("5/minute")
def refresh_access_token(request: Request, body: RefreshTokenRequest):
    """
    Exchange valid 7-day refresh token for a fresh 15-minute access token.
    """
    payload = decode_token(body.refresh_token, expected_type="refresh")
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = USERS_DB.get(email)
    user_id = user["id"] if user else payload.get("uid", f"user-{uuid.uuid4().hex[:8]}")

    token_data = {"sub": email, "uid": user_id}
    new_access_token = create_access_token(token_data)
    # Also rotate refresh token
    new_refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@app.get("/auth/me", response_model=UserResponse)
def get_current_user_profile(user: dict = Depends(get_current_user)):
    """Return currently authenticated user identity."""
    return UserResponse(id=user["id"], email=user["email"])


# ── Gig Endpoints ────────────────────────────────────────────────────────────

@app.get("/gigs", response_model=list[Gig])
def get_gigs():
    """Return all available freelance gigs (public feed)."""
    if not GIGS_CACHE:
        load_gigs()
    return list(GIGS_CACHE.values())


@app.get("/gigs/{gig_id}", response_model=Gig)
def get_gig(gig_id: str):
    """Return a single gig by ID (public)."""
    if not GIGS_CACHE:
        load_gigs()
    if gig_id not in GIGS_CACHE:
        raise HTTPException(status_code=404, detail="Gig not found")
    return GIGS_CACHE[gig_id]


@app.post("/gigs", response_model=Gig, status_code=status.HTTP_201_CREATED)
def create_gig(body: GigCreateRequest, current_user: dict = Depends(get_current_user)):
    """
    Protected gig write endpoint. Returns 401 for missing or invalid token.
    """
    gig_id = f"gig-{uuid.uuid4().hex[:8]}"
    new_gig = Gig(
        id=gig_id,
        title=body.title,
        category=body.category,
        description=body.description,
        budget=body.budget,
        currency=body.currency,
        timeline=body.timeline,
        skills=body.skills,
        buyer=BuyerInfo(
            name=current_user.get("email", "Employer"),
            verified=True,
            rating=5.0,
            jobs=1,
        ),
        gradient=body.gradient or "from-indigo-600 to-purple-600",
    )
    GIGS_CACHE[gig_id] = new_gig
    return new_gig


# ── Negotiation Endpoints (Protected & Rate-Limited) ─────────────────────────

@app.post("/negotiations", response_model=NegotiationStarted, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute", key_func=get_user_or_ip)
def start_negotiation(
    request: Request,
    req: NegotiationRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Start a background multi-agent negotiation session.
    Protected: Requires valid Bearer JWT access token (returns 401 if missing/invalid).
    Rate limited: 10 per minute per user/IP (returns 429 with Retry-After).
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
