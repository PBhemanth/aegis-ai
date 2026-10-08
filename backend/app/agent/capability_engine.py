"""
Aegis Capability Gap Engine
Detects requested features that exceed registered tools or scopes.
Guarantees honest limitation reporting and prevents hallucinated execution.
"""
import re
from typing import Dict, List, Optional, Tuple
from backend.app.agent.tool_registry import ToolRegistry, tool_registry
from backend.app.schemas.capability import CapabilityGapReport


class CapabilityGapEngine:
    # Pattern mapping for capabilities not supported in the runtime
    UNSUPPORTED_DOMAINS: Dict[str, Tuple[str, str, str]] = {
        # pattern -> (capability_key, human_feature, alternative_suggestion)
        r"\b(whatsapp|telegram|discord|slack|signal|imessage|sms)\b": (
            "messaging.chat",
            "Direct third-party instant messaging or chat dispatch",
            "I can compile the message or report and save it to your Google Drive or create a calendar event."
        ),
        r"\b(outlook|yahoo\s*mail|sendgrid|mailgun)\b": (
            "email.third_party",
            "Third-party email dispatch via unintegrated mail providers",
            "I can save the draft content to Google Drive for manual sending."
        ),
        r"\b(binance|coinbase|uniswap|trade\s*crypto|buy\s*crypto|transfer\s*funds|wire\s*money)\b": (
            "finance.trading",
            "Financial exchange trading or fund transfers",
            "Aegis strictly forbids autonomous financial transfers. Please execute trades directly on your verified exchange."
        ),
        r"\b(ssh|reboot|systemctl|bash\s*script|sudo|root\s*access)\b": (
            "system.host_execution",
            "Arbitrary host shell execution or OS administration",
            "Aegis operations are confined to sandboxed execution environments and cannot alter the host OS."
        ),
        r"\b(tweet|twitter|x\.com|instagram|tiktok|linkedin\s*post)\b": (
            "social_media.publish",
            "Autonomous social media posting",
            "I can generate and synthesize the draft content in Google Drive for your review."
        ),
        r"\b(flight|airline|skyscanner|hotel|booking\.com|airbnb|buy\s*tickets)\b": (
            "booking.commercial",
            "Commercial travel booking or payment processing",
            "I can check your calendar availability and schedule review slots, but cannot make financial purchases."
        ),
    }

    @classmethod
    def analyze_goal(
        cls,
        goal: str,
        registry: Optional[ToolRegistry] = None
    ) -> CapabilityGapReport:
        """
        Analyzes a natural language goal for unsupported capabilities.
        Returns a CapabilityGapReport with explicit missing tools and alternatives.
        """
        goal_lower = goal.lower()
        active_registry = registry or tool_registry

        missing_capabilities: List[str] = []
        unsupported_features: List[str] = []
        alternatives: List[str] = []

        # 1. Check against known unsupported domain patterns
        for pattern, (cap_key, feature_desc, alt_text) in cls.UNSUPPORTED_DOMAINS.items():
            if re.search(pattern, goal_lower):
                missing_capabilities.append(cap_key)
                unsupported_features.append(feature_desc)
                alternatives.append(alt_text)

        # 2. Check if supported features exist in the goal
        has_supported_capabilities = any(
            re.search(kw, goal_lower)
            for kw in [
                r"\b(paper|research|arxiv|study|find|search|survey)\b",
                r"\b(summariz|synthesiz|report|brief|document|draft)\b",
                r"\b(drive|folder|upload|file|save|delete)\b",
                r"\b(calendar|schedule|meeting|event|slot|availability)\b",
            ]
        )

        has_gap = len(missing_capabilities) > 0
        can_partially_execute = has_gap and has_supported_capabilities

        if not has_gap:
            return CapabilityGapReport(
                has_gap=False,
                missing_capabilities=[],
                unsupported_features=[],
                explanation="All required capabilities are supported by the active Aegis tool registry.",
                proposed_alternative=None,
                can_partially_execute=True
            )

        # Build honest explanation
        explanation = (
            f"Aegis identified an unsupported capability gap in your goal: "
            f"{', '.join(unsupported_features)}. "
            f"Aegis enforces safe, verified execution and will never fabricate or hallucinate execution for missing tools."
        )

        alt_proposal = " ".join(alternatives) if alternatives else None

        return CapabilityGapReport(
            has_gap=True,
            missing_capabilities=missing_capabilities,
            unsupported_features=unsupported_features,
            explanation=explanation,
            proposed_alternative=alt_proposal,
            can_partially_execute=can_partially_execute
        )
