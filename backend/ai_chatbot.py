import os
import json
import re
from typing import List, Dict, Any
import google.generativeai as genai

# Common decision categories and their typical criteria for the local fallback
COMMON_CATEGORIES = {
    "laptop": {
        "alternatives": ["Dell XPS", "MacBook Air", "Lenovo ThinkPad", "Asus ROG"],
        "criteria": {
            "price": {"name": "Price (₹)", "type": "cost", "weight": 0.3, "min": 30000, "max": 150000},
            "performance": {"name": "Performance (1-10)", "type": "benefit", "weight": 0.3, "min": 1, "max": 10},
            "battery": {"name": "Battery Life (Hrs)", "type": "benefit", "weight": 0.2, "min": 2, "max": 18},
            "weight": {"name": "Weight (Kg)", "type": "cost", "weight": 0.2, "min": 1.0, "max": 3.0}
        },
        "constraints": [
            {"criterion_id": "price", "operator": "<", "value": 100000}
        ]
    },
    "college": {
        "alternatives": ["IIT Bombay", "BITS Pilani", "Delhi University", "VIT"],
        "criteria": {
            "fees": {"name": "Annual Fees (₹)", "type": "cost", "weight": 0.25, "min": 50000, "max": 400000},
            "placement": {"name": "Avg Placement (LPA)", "type": "benefit", "weight": 0.35, "min": 5, "max": 25},
            "ranking": {"name": "National Rank", "type": "cost", "weight": 0.20, "min": 1, "max": 100},
            "campus_life": {"name": "Campus Rating (1-5)", "type": "benefit", "weight": 0.20, "min": 1, "max": 5}
        },
        "constraints": [
            {"criterion_id": "fees", "operator": "<", "value": 250000}
        ]
    },
    "travel": {
        "alternatives": ["Goa", "Manali", "Kerala", "Ladakh"],
        "criteria": {
            "cost": {"name": "Estimated Cost (₹)", "type": "cost", "weight": 0.35, "min": 10000, "max": 60000},
            "safety": {"name": "Safety Rating (1-5)", "type": "benefit", "weight": 0.25, "min": 1, "max": 5},
            "activities": {"name": "Activity Options (1-10)", "type": "benefit", "weight": 0.20, "min": 1, "max": 10},
            "travel_time": {"name": "Travel Time (Hrs)", "type": "cost", "weight": 0.20, "min": 2, "max": 18}
        },
        "constraints": [
            {"criterion_id": "cost", "operator": "<", "value": 40000}
        ]
    }
}

class AIChatbot:
    @staticmethod
    def chat(
        message: str,
        history: List[Dict[str, str]],
        current_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processes chatbot queries.
        Returns:
            - reply: The text message from the AI.
            - extracted_data: Dictionary of extracted decision details (if any).
        """
        api_key = os.environ.get("GEMINI_API_KEY")
        
        if api_key:
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel("gemini-1.5-flash")
                
                # Format system instructions and conversation context
                formatted_history = []
                for h in history:
                    role = "user" if h["role"] == "user" else "model"
                    formatted_history.append({"role": role, "parts": [h["content"]]})
                
                # Create a prompt for structured parsing
                prompt = f"""
You are an expert AI Decision Agent assisting a user with a Multi-Criteria Decision Support System (MCDSS).
Your goal is to converse with the user and extract decision components (decision name, alternatives, criteria, weights, constraints).

CURRENT MCDSS STATE (JSON):
{json.dumps(current_state, indent=2)}

USER NEW MESSAGE:
"{message}"

You must respond in JSON with exactly two fields:
1. "reply": A helpful, friendly, conversational text reply. If the user is asking for recommendations, criteria suggestions, or explaining choices, answer their question comprehensively. Keep it under 4 sentences unless detailed criteria suggestions are requested.
2. "extracted_data": An optional object containing any updates to the decision state you can extract from the user's text. If you can't extract any new data, set it to null. If you extract data, it must follow this structure:
{{
  "decision_name": "Decide Best Laptop" (optional),
  "alternatives": ["Dell", "HP"] (optional - list of names),
  "criteria": {{
     "price": {{"name": "Price (₹)", "type": "cost", "weight": 0.4, "min": 30000, "max": 100000}},
     "battery": {{"name": "Battery Life", "type": "benefit", "weight": 0.6, "min": 2, "max": 15}}
  }} (optional - criteria key maps to its parameters. Ensure weights sum to 1.0, benefit/cost type is set correctly),
  "constraints": [
     {{"criterion_id": "price", "operator": "<", "value": 70000}},
     {{"criterion_id": "battery", "operator": ">=", "value": 8}}
  ] (optional)
}}

Make sure to dynamically map keywords like "under", "budget", "less than" to "<" or "<=" constraints, and "at least", "higher than", "more than" to ">=" or ">" constraints.

Return ONLY valid JSON. Do not include markdown code block formatting. Return the raw JSON string directly.
"""
                response = model.generate_content(prompt)
                text = response.text.strip()
                
                # Clean up markdown code blocks if present
                if text.startswith("```"):
                    text = text.split("\n", 1)[1]
                    if text.endswith("```"):
                        text = text.rsplit("\n", 1)[0]
                    if text.startswith("json"):
                        text = text.split("\n", 1)[1]
                        
                result = json.loads(text)
                return result
                
            except Exception as e:
                # Fallback to local rule-based parsing
                return AIChatbot.local_chat_fallback(message, current_state)
        else:
            return AIChatbot.local_chat_fallback(message, current_state)

    @staticmethod
    def local_chat_fallback(message: str, current_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Local text-matching engine that processes queries, suggests criteria,
        and extracts alternatives/constraints using basic regex.
        """
        msg_lower = message.lower()
        extracted_data = {}
        reply = "I'm running in local heuristic mode. Set your Gemini API key in the backend `.env` file for advanced conversational capabilities!"

        # 1. Check for decision category trigger
        category_found = None
        for cat in COMMON_CATEGORIES.keys():
            if cat in msg_lower:
                category_found = cat
                break
                
        if category_found:
            cat_data = COMMON_CATEGORIES[category_found]
            extracted_data = {
                "decision_name": f"Choose Best {category_found.capitalize()}",
                "alternatives": cat_data["alternatives"],
                "criteria": cat_data["criteria"],
                "constraints": cat_data["constraints"]
            }
            reply = f"I've initialized a decision template for choosing a **{category_found.capitalize()}**. I populated standard criteria: {', '.join(cat_data['criteria'].keys())} and added alternatives: {', '.join(cat_data['alternatives'])}."
        else:
            # Try to extract a custom decision name
            name_match = re.search(r"(?:choose|decide|select)\s+(?:best|a)\s+([a-zA-Z0-9\s_]{3,30})", msg_lower)
            if name_match:
                d_name = name_match.group(1).strip()
                extracted_data["decision_name"] = f"Choose Best {d_name.capitalize()}"
                reply = f"I've set the decision name to: **Choose Best {d_name.capitalize()}**. Feel free to add alternatives and criteria!"

        # 2. Extract Alternatives: look for "add alternatives: X, Y, Z" or similar
        alt_match = re.search(r"(?:alternatives?|options?):\s*([a-zA-Z0-9\s,\-\._]+)", msg_lower)
        if alt_match:
            alts = [a.strip().title() for a in alt_match.group(1).split(",") if a.strip()]
            if alts:
                extracted_data["alternatives"] = alts
                reply += f" Extracted alternatives: {', '.join(alts)}."

        # 3. Extract budget/price constraint: e.g., "under 50000" or "budget 80000"
        price_match = re.search(r"(?:under|budget|less than|max(?:imum)?)\s*(?:₹|rs\.?|\$)?\s*(\d+)", msg_lower)
        if price_match:
            limit = float(price_match.group(1))
            # Check if 'price' is in current_state criteria or extracted_data criteria
            crit_keys = list((current_state.get("criteria") or {}).keys()) + list((extracted_data.get("criteria") or {}).keys())
            
            # Use 'price' if it exists or default to creating it
            crit_id = "price" if "price" in crit_keys else "cost"
            
            extracted_data["constraints"] = [
                {"criterion_id": crit_id, "operator": "<", "value": limit}
            ]
            reply += f" Added a constraint: {crit_id} must be < {limit}."

        # Assemble result
        return {
            "reply": reply,
            "extracted_data": extracted_data if extracted_data else None
        }

    @staticmethod
    def suggest_criteria(category: str) -> Dict[str, Any]:
        """
        Suggests criteria based on decision category.
        """
        api_key = os.environ.get("GEMINI_API_KEY")
        cat_lower = category.lower()
        
        # Local lookup first for popular categories
        for cat_key, data in COMMON_CATEGORIES.items():
            if cat_key in cat_lower:
                return {
                    "criteria": data["criteria"],
                    "source": "Local Decision Templates"
                }

        if api_key:
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel("gemini-1.5-flash")
                
                prompt = f"""
Suggest exactly 4 relevant criteria to make a decision about: "{category}".
For each criterion, provide:
1. Key name (e.g. price, performance)
2. Display name (e.g. Price ($), Battery (Hrs))
3. Type: either "benefit" (higher value is better) or "cost" (lower value is better)
4. Default Weight (between 0.0 and 1.0, total sum of all weights must be exactly 1.0)
5. Min (typical minimum numeric value)
6. Max (typical maximum numeric value)

Return the output ONLY as a JSON object matching this structure:
{{
  "criteria": {{
     "crit_key_1": {{"name": "Display Name", "type": "benefit", "weight": 0.25, "min": 0, "max": 100}},
     ...
  }}
}}
Return only the raw JSON.
"""
                response = model.generate_content(prompt)
                text = response.text.strip()
                if text.startswith("```"):
                    text = text.split("\n", 1)[1]
                    if text.endswith("```"):
                        text = text.rsplit("\n", 1)[0]
                    if text.startswith("json"):
                        text = text.split("\n", 1)[1]
                
                return json.loads(text)
            except Exception:
                pass
                
        # Generic fallback criteria
        return {
            "criteria": {
                "cost": {"name": "Cost ($)", "type": "cost", "weight": 0.3, "min": 1, "max": 1000},
                "quality": {"name": "Quality / Rating (1-10)", "type": "benefit", "weight": 0.3, "min": 1, "max": 10},
                "reliability": {"name": "Reliability (1-5)", "type": "benefit", "weight": 0.2, "min": 1, "max": 5},
                "convenience": {"name": "Convenience (1-5)", "type": "benefit", "weight": 0.2, "min": 1, "max": 5}
            },
            "source": "Generic Decision Engine Default"
        }
