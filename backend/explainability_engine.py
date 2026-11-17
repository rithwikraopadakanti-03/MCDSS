import os
import json
from typing import List, Dict, Any
import google.generativeai as genai

class ExplainabilityEngine:
    @staticmethod
    def generate_explanations(
        decision_name: str,
        passed_alternatives: List[Dict[str, Any]],
        failed_alternatives: List[Dict[str, Any]],
        criteria: Dict[str, Dict[str, Any]],
        weights: Dict[str, float],
        confidence_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generates structured, natural-language explanation reports.
        Utilizes Gemini API when available, otherwise falls back to a template-driven expert engine.
        """
        api_key = os.environ.get("GEMINI_API_KEY")
        
        # Prepare context data
        summary_data = {
            "decision": decision_name,
            "passed": [
                {
                    "name": alt["name"],
                    "rank_utility": alt.get("search_rank_utility", alt.get("utility_score", 0.0)),
                    "values": alt["values"]
                }
                for alt in passed_alternatives
            ],
            "failed": [
                {
                    "name": alt["name"],
                    "violations": [v["constraint_desc"] for v in alt.get("violations", [])]
                }
                for alt in failed_alternatives
            ],
            "criteria": criteria,
            "weights": weights,
            "confidence": confidence_data
        }

        if api_key:
            try:
                genai.configure(api_key=api_key)
                # Use gemini-1.5-flash for speed and reliability
                model = genai.GenerativeModel("gemini-1.5-flash")
                
                prompt = f"""
You are an advanced AI decision science agent. Analyze the following Multi-Criteria Decision Support System (MCDSS) data and generate a professional, clear, and comprehensive explanation report.

MCDSS DECISION REPORT DATA (JSON format):
{json.dumps(summary_data, indent=2)}

Generate a JSON object with the following structure:
{{
  "recommendation_summary": "A 2-3 sentence high-level recommendation summarizing why the top option is best and who it is for.",
  "strengths_analysis": [
    {{
      "alternative_name": "Name of option",
      "strengths": ["Strength 1 (specific to criteria and utility contributions)", "Strength 2"]
    }}
  ],
  "tradeoff_analysis": "An analysis of critical trade-offs (e.g., higher price for higher performance) among the top alternatives.",
  "rejection_explanations": [
    {{
      "alternative_name": "Name of rejected/failed option",
      "reason": "Clear explanation of why it failed constraints or why it ranked low in utility."
    }}
  ],
  "reasoning_logic": "An explanation of how A* search pruned violating states and how utility-based weights determined the final ranking."
}}

Return ONLY valid JSON. Do not include markdown code block formatting like ```json or ```. Return the raw JSON string directly.
"""
                response = model.generate_content(prompt)
                text = response.text.strip()
                # Clean up markdown code blocks if the model included them
                if text.startswith("```"):
                    text = text.split("\n", 1)[1]
                    if text.endswith("```"):
                        text = text.rsplit("\n", 1)[0]
                    if text.startswith("json"):
                        text = text.split("\n", 1)[1]
                
                return json.loads(text)
                
            except Exception as e:
                # Fallback to local rule-based explanation on error
                return ExplainabilityEngine.generate_rule_based(passed_alternatives, failed_alternatives, criteria, weights, confidence_data)
        else:
            return ExplainabilityEngine.generate_rule_based(passed_alternatives, failed_alternatives, criteria, weights, confidence_data)

    @staticmethod
    def generate_rule_based(
        passed_alternatives: List[Dict[str, Any]],
        failed_alternatives: List[Dict[str, Any]],
        criteria: Dict[str, Dict[str, Any]],
        weights: Dict[str, float],
        confidence_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Deterministic, template-driven explainability fallback generator.
        """
        report = {
            "recommendation_summary": "",
            "strengths_analysis": [],
            "tradeoff_analysis": "",
            "rejection_explanations": [],
            "reasoning_logic": ""
        }

        # 1. Summary
        if not passed_alternatives:
            report["recommendation_summary"] = "No alternatives satisfied the specified constraints. We recommend relaxing some of the boundaries (e.g., budget limits or score thresholds) to expand the candidate set."
        else:
            top = passed_alternatives[0]
            score_type = "search rank utility" if "search_rank_utility" in top else "weighted utility"
            score = top.get("search_rank_utility", top.get("utility_score", 0.0))
            
            summary = f"Based on the multi-criteria utility calculations, '{top['name']}' is the optimal choice with a {score_type} score of {score:.2f}."
            if len(passed_alternatives) > 1:
                runner_up = passed_alternatives[1]
                ru_score = runner_up.get("search_rank_utility", runner_up.get("utility_score", 0.0))
                summary += f" It outranked the runner-up '{runner_up['name']}' (score: {ru_score:.2f}) by a margin of {score - ru_score:.2f}."
            
            report["recommendation_summary"] = summary

        # 2. Strengths Analysis
        for alt in passed_alternatives[:3]:  # Top 3
            strengths = []
            breakdown = alt.get("utility_breakdown", {})
            
            # Find criteria where utility normalized score is high (> 0.7)
            for crit_id, details in breakdown.items():
                norm = details.get("normalized", 0.0)
                crit_name = criteria.get(crit_id, {}).get("name", crit_id)
                raw_val = details.get("raw", 0.0)
                
                if norm >= 0.75:
                    strengths.append(f"Exceptional performance in {crit_name} (normalized utility: {norm:.1f}, raw value: {raw_val})")
                elif norm >= 0.5:
                    # check if weight is high
                    if details.get("weight", 0.0) > 0.3:
                        strengths.append(f"Strong alignment with high-priority criterion {crit_name} (weight: {details['weight']:.2f}, raw value: {raw_val})")
            
            if not strengths:
                strengths.append("Moderate balance across all weighted criteria.")
                
            report["strengths_analysis"].append({
                "alternative_name": alt["name"],
                "strengths": strengths
            })

        # 3. Tradeoff Analysis
        if len(passed_alternatives) > 1:
            top = passed_alternatives[0]
            ru = passed_alternatives[1]
            tb_top = top.get("utility_breakdown", {})
            tb_ru = ru.get("utility_breakdown", {})
            
            top_advantages = []
            ru_advantages = []
            
            for crit_id, crit_info in criteria.items():
                norm_top = tb_top.get(crit_id, {}).get("normalized", 0.0)
                norm_ru = tb_ru.get(crit_id, {}).get("normalized", 0.0)
                crit_name = crit_info.get("name", crit_id)
                
                if norm_top - norm_ru > 0.15:
                    top_advantages.append(crit_name)
                elif norm_ru - norm_top > 0.15:
                    ru_advantages.append(crit_name)
                    
            tradeoff = f"Choosing '{top['name']}' over '{ru['name']}' represents a strategic optimization. "
            if top_advantages and ru_advantages:
                tradeoff += f"'{top['name']}' offers superior value in {', '.join(top_advantages)}, whereas '{ru['name']}' is stronger in {', '.join(ru_advantages)}."
            elif top_advantages:
                tradeoff += f"'{top['name']}' yields a clear advantage in {', '.join(top_advantages)} with equivalent performance elsewhere."
            else:
                tradeoff += f"Both options are extremely competitive, but '{top['name']}' holds slightly better aggregate utility values."
                
            report["tradeoff_analysis"] = tradeoff
        else:
            report["tradeoff_analysis"] = "With only one feasible alternative, there are no primary trade-offs to evaluate against other candidates."

        # 4. Rejections & Failures
        for alt in failed_alternatives:
            violations = [v["constraint_desc"] for v in alt.get("violations", [])]
            report["rejection_explanations"].append({
                "alternative_name": alt["name"],
                "reason": f"Rejected by CSP constraints: {', '.join(violations)}."
            })
            
        # Add passed low utility items as well
        if len(passed_alternatives) > 3:
            for alt in passed_alternatives[3:]:
                score = alt.get("search_rank_utility", alt.get("utility_score", 0.0))
                report["rejection_explanations"].append({
                    "alternative_name": alt["name"],
                    "reason": f"Satisfied constraints but scored lower overall utility ({score:.2f}) than the top-ranked options."
                })

        # 5. Reasoning Logic
        logic = "The system operated as a utility-based intelligent agent. First, the Constraint Satisfaction solver pruned violating options. "
        logic += "Then, the A* Search algorithm explored candidate states, using an admissible heuristic based on remaining distance to target utilities. "
        logic += "The search successfully minimized evaluations and prioritized candidates based on user-weighted importance factors."
        report["reasoning_logic"] = logic

        return report
