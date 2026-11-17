"""
voice_processor.py
Processes voice-to-text transcripts and extracts structured decision parameters.
The actual speech recognition runs client-side via the Web Speech API.
This module handles server-side parsing of the resulting text.
"""
import re
from typing import Dict, Any, List

OPERATORS_MAP = {
    "under": "<",
    "below": "<",
    "less than": "<",
    "at most": "<=",
    "no more than": "<=",
    "above": ">",
    "over": ">",
    "more than": ">",
    "at least": ">=",
    "no less than": ">=",
    "equal to": "==",
    "exactly": "=="
}

def process_voice_transcript(transcript: str) -> Dict[str, Any]:
    """
    Parses a voice transcript and extracts decision components.
    Returns a structured dictionary compatible with the MCDSS state format.
    """
    text = transcript.lower().strip()
    result: Dict[str, Any] = {
        "decision_name": None,
        "alternatives": [],
        "criteria": {},
        "constraints": [],
        "raw_transcript": transcript
    }
    
    # --- Extract decision name ---
    name_patterns = [
        r"(?:i want to|help me|i need to)\s+(?:choose|pick|select|decide)\s+(?:a|an|the)?\s+(?:best\s+)?([a-zA-Z\s]+?)(?:\s+for|\s+under|\s+with|\.|$)",
        r"(?:find|recommend)\s+(?:the\s+)?(?:best\s+)?([a-zA-Z\s]+?)(?:\s+for|\s+under|\s+with|\.|$)"
    ]
    for pat in name_patterns:
        m = re.search(pat, text)
        if m:
            result["decision_name"] = f"Choose Best {m.group(1).strip().title()}"
            break
    
    # --- Extract alternatives ---
    alt_pattern = r"(?:options?|alternatives?|choices?)(?:\s+are)?[:\s]+([a-zA-Z0-9\s,]+?)(?:\s+and\s+|\.|$)"
    alt_match = re.search(alt_pattern, text)
    if alt_match:
        raw_alts = alt_match.group(1)
        alts = [a.strip().title() for a in re.split(r"[,]|\band\b", raw_alts) if a.strip()]
        result["alternatives"] = alts

    # --- Extract numeric constraints ---
    # E.g.: "under 70000", "at least 8 hours battery", "more than 4 stars rating"
    constraint_pattern = r"(" + "|".join(re.escape(k) for k in OPERATORS_MAP.keys()) + r")\s+(?:₹|rs\.?|\$)?\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|km|stars?|lpa|lakhs?|k)?"
    for m in re.finditer(constraint_pattern, text, re.IGNORECASE):
        operator_word = m.group(1).lower()
        value = float(m.group(2))
        operator = OPERATORS_MAP.get(operator_word, "<")
        
        # Guess which criterion this applies to by context
        context_window = text[max(0, m.start()-30):m.end()+30]
        criterion_id = _guess_criterion(context_window)
        
        result["constraints"].append({
            "criterion_id": criterion_id,
            "operator": operator,
            "value": value
        })

    return result


def _guess_criterion(context: str) -> str:
    """Guesses the criterion ID from surrounding context keywords."""
    context = context.lower()
    if any(w in context for w in ["price", "cost", "budget", "rupee", "dollar", "₹", "$", "rs", "lakh"]):
        return "price"
    if any(w in context for w in ["battery", "hour", "hrs", "backup"]):
        return "battery"
    if any(w in context for w in ["perform", "speed", "power", "gpu", "cpu", "processor"]):
        return "performance"
    if any(w in context for w in ["weight", "light", "heavy", "kg", "gram"]):
        return "weight"
    if any(w in context for w in ["rating", "star", "review", "score"]):
        return "rating"
    if any(w in context for w in ["distance", "km", "mile"]):
        return "distance"
    if any(w in context for w in ["salary", "package", "lpa", "ctc"]):
        return "salary"
    return "value"


def extract_alternatives_from_voice(transcript: str) -> List[str]:
    """
    Extracts a flat list of alternative names from voice input.
    E.g.: "Compare Dell, HP, Lenovo, and Asus" -> ["Dell", "HP", "Lenovo", "Asus"]
    """
    text = transcript.lower()
    # Look for comma/and-separated brand/option names following trigger words
    triggers = ["compare", "between", "alternatives", "options", "choices", "versus", "vs"]
    for trigger in triggers:
        pattern = rf"{trigger}\s+([a-zA-Z0-9\s,]+?)(?:\.|and compare|\?|$)"
        m = re.search(pattern, text)
        if m:
            raw = m.group(1)
            alts = [a.strip().title() for a in re.split(r"[,]|\band\b", raw) if len(a.strip()) > 1]
            if alts:
                return alts
    return []
