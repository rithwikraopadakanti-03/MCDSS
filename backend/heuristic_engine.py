import math
from typing import List, Dict, Any

class HeuristicEngine:
    @staticmethod
    def calculate_confidence_and_certainty(
        ranked_alternatives: List[Dict[str, Any]],
        constraints: List[Dict[str, Any]],
        weights: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Calculates recommendation certainty % and AI confidence score (0-100%).
        Considers:
        - Utility margin (difference between 1st and 2nd alternative).
        - Constraint margin (safety distance of the top option from constraints).
        - Weight distribution entropy (concentrated vs diversified weights).
        """
        if not ranked_alternatives:
            return {"certainty_percentage": 0, "confidence_score": 0.0, "reason": "No valid options found."}

        # 1. Utility Margin (0 to 40% weight)
        margin_score = 0.0
        margin_reason = "No second option to compare."
        if len(ranked_alternatives) > 1:
            u1 = ranked_alternatives[0].get("search_rank_utility", ranked_alternatives[0].get("utility_score", 0.0))
            u2 = ranked_alternatives[1].get("search_rank_utility", ranked_alternatives[1].get("utility_score", 0.0))
            diff = u1 - u2
            
            # If the best is at least 0.20 better in utility than the second, we have high margin confidence
            margin_score = min(1.0, diff / 0.20) * 40.0
            margin_reason = f"Top option is {diff*100:.1f}% higher in utility than runner-up."
        else:
            margin_score = 40.0 # Only one alternative, so it's a clear choice

        # 2. Constraint Margin Safety (0 to 40% weight)
        # Check how close the top alternative is to the limits of the constraints
        top_alt = ranked_alternatives[0]
        top_vals = top_alt.get("values", {})
        
        constraint_safety_scores = []
        for constr in constraints:
            crit_id = constr["criterion_id"]
            op = constr["operator"]
            limit = float(constr["value"])
            val = float(top_vals.get(crit_id, limit))
            
            # Measure closeness to boundary
            denominator = max(abs(limit), 1.0)
            diff = abs(val - limit) / denominator
            
            # If it's a tight squeeze (within 2% of the boundary), safety is low. If far, safety is high.
            safety = min(1.0, diff / 0.15)  # 15% distance gives max safety
            constraint_safety_scores.append(safety)
            
        if constraint_safety_scores:
            constraint_score = (sum(constraint_safety_scores) / len(constraint_safety_scores)) * 40.0
            constraint_reason = "Top option satisfies constraints with safe margins."
        else:
            constraint_score = 40.0 # No constraints, so safety is maximum
            constraint_reason = "No constraints applied, no risk of violation."

        # 3. Weight Entropy / Diversity (0 to 20% weight)
        # Avoid scenarios where one single criteria has 99% weight unless it was intended.
        # Entropy is higher when weights are more distributed.
        entropy_score = 20.0
        entropy_reason = "Weights are well balanced."
        if weights:
            total_w = sum(weights.values())
            if total_w > 0:
                norm_w = [w / total_w for w in weights.values() if w > 0]
                entropy = -sum(p * math.log2(p) for p in norm_w)
                max_entropy = math.log2(len(weights)) if len(weights) > 1 else 1.0
                
                # Normalize entropy between 0 and 1
                entropy_ratio = (entropy / max_entropy) if max_entropy > 0 else 1.0
                entropy_score = entropy_ratio * 20.0
                if entropy_ratio < 0.3:
                    entropy_reason = "Weights are highly concentrated on single criteria."
                    
        total_certainty = margin_score + constraint_score + entropy_score
        
        # Round it to integer percent
        certainty_pct = max(10, min(100, int(round(total_certainty))))
        
        confidence_desc = "Low"
        if certainty_pct >= 80:
            confidence_desc = "High / Certain"
        elif certainty_pct >= 50:
            confidence_desc = "Moderate / Plausible"
            
        return {
            "certainty_percentage": certainty_pct,
            "confidence_desc": confidence_desc,
            "breakdown": {
                "margin_score": round(margin_score, 2),
                "constraint_score": round(constraint_score, 2),
                "entropy_score": round(entropy_score, 2)
            },
            "reasons": [margin_reason, constraint_reason, entropy_reason]
        }

    @staticmethod
    def suggest_weight_balancing(weights: Dict[str, float]) -> Dict[str, Any]:
        """
        Scans weight distribution and suggests a balanced set of weights.
        If a weight is extremely high (e.g. > 0.7) and others are low, suggests spreading them.
        """
        suggestions = {}
        total = sum(weights.values())
        if total <= 0:
            return {"adjusted_weights": weights, "actions": []}
            
        norm_weights = {k: v / total for k, v in weights.items()}
        actions = []
        
        for k, v in norm_weights.items():
            if v > 0.6:
                actions.append(f"Criterion '{k}' has a very high weight ({v*100:.1f}%). Consider balancing it to prevent bias.")
                # Propose reducing it and sharing difference with other items
                target = 0.4
                diff = v - target
                share = diff / (len(weights) - 1) if len(weights) > 1 else 0
                
                adjusted = {}
                for k2, v2 in norm_weights.items():
                    if k2 == k:
                        adjusted[k2] = target
                    else:
                        adjusted[k2] = v2 + share
                suggestions["adjusted_weights"] = adjusted
                break
                
        if not actions:
            suggestions["adjusted_weights"] = weights
            suggestions["actions"] = ["Weights are currently balanced and objective."]
        else:
            suggestions["actions"] = actions
            
        return suggestions
