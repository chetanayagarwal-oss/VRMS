"""
backend/llm_interface.py
────────────────────────
Thin abstraction over the LLM so tests can swap in a fake or mock.

Public surface:
    build_llm(override=None)   -> BaseChatModel or Duck-typed ChatModel
    parse_offer(text)          -> float | None
"""

from __future__ import annotations
import re
from typing import Any
from pydantic import BaseModel
from langchain_core.messages import AIMessage, BaseMessage
from config import settings


class SimulatedChatModel:
    """
    Fallback chat model used when no OpenAI/Anthropic API key is configured.
    Generates realistic negotiation messages so the app works out-of-the-box.
    """
    def __init__(self, model_name: str = "simulated-agent"):
        self.model_name = model_name

    def invoke(self, messages: list[BaseMessage] | list[Any], **kwargs) -> AIMessage:
        # Check system prompt to see if this is buyer or seller
        sys_text = ""
        for m in messages:
            content = getattr(m, "content", "")
            if isinstance(content, str) and ("BUYER" in content.upper() or "SELLER" in content.upper()):
                sys_text = content
                break

        is_buyer = "BUYER" in sys_text.upper()

        # Extract suggested range or numbers from prompt if present
        target_match = re.search(r"offer\s*(?:around|of|at)?\s*\$?(\d+(?:\.\d+)?)", sys_text, re.I)
        price_hint = float(target_match.group(1)) if target_match else (1800.0 if is_buyer else 2200.0)

        if is_buyer:
            text = f"We appreciate your skills and would like to propose a rate of ${price_hint:.0f} USDC for this milestone."
        else:
            text = f"Given the scope and delivery timeline, our rate is ${price_hint:.0f} USDC for full execution."

        return AIMessage(content=text)

    async def ainvoke(self, messages: list[BaseMessage] | list[Any], **kwargs) -> AIMessage:
        return self.invoke(messages, **kwargs)


def build_llm(override: Any | None = None) -> Any:
    """
    Return a configured LangChain chat model.
    Pass `override` in tests or custom setups to inject a fake model.
    If no API key is provided, returns a SimulatedChatModel.
    """
    if override is not None:
        return override

    provider = settings.llm_provider.lower()

    if provider == "anthropic" and settings.anthropic_api_key:
        try:
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(
                model=settings.llm_model or "claude-3-haiku-20240307",
                api_key=settings.anthropic_api_key,
                temperature=0.4,
            )
        except Exception:
            pass

    if settings.openai_api_key:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=settings.llm_model or "gpt-4o-mini",
                api_key=settings.openai_api_key,
                temperature=0.4,
            )
        except Exception:
            pass

    # Fallback to simulated chat model if no API key is present
    return SimulatedChatModel()


_PRICE_RE = re.compile(r"\b(?:\$)?(\d[\d,]*(?:\.\d+)?)\b")


def parse_offer(text: str) -> float | None:
    """
    Extract the first reasonable number that looks like an offer price from message text.
    Returns None if no number is found.
    """
    matches = _PRICE_RE.findall(text)
    for m in matches:
        try:
            val = float(m.replace(",", ""))
            # Filter out tiny integers like round numbers 1, 2 or year 2026
            if val >= 50:
                return val
        except ValueError:
            continue
    # If no number >= 50 found, try any positive number
    for m in matches:
        try:
            val = float(m.replace(",", ""))
            if val > 0:
                return val
        except ValueError:
            continue
    return None
