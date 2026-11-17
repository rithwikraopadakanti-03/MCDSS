from typing import List, Dict, Any, Tuple

def normalize_value(value: float, min_val: float, max_val: float, criterion_type: str) -> float:
    """
    Normalizes a criterion value to the range [0.0, 1.0].
    criterion_type: 'benefit' (higher is better) or 'cost' (lower is better).
    """
    if abs(max_val - min_val) < 1e-9:
        return 1.0  # If all options have the same value, utility is 1.0
    
    if criterion_type == "benefit":
        val = (value - min_val) / (max_val - min_val)
    else:  # cost
        val = (max_val - value) / (max_val - min_val)
        
    return max(0.0, min(1.0, val))

class UtilityCalculator:
    @staticmethod
    def calculate_utilities(
        alternatives: List[Dict[str, Any]],
        criteria: Dict[str, Dict[str, Any]],
        weights: Dict[str, float]
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Calculates utility scores for each alternative.
        criteria format: {
            "price": {"type": "cost", "min": 0, "max": 100000}, ...
        }
        weights format: {"price": 0.4, "performance": 0.6}
        """
        logs = []
        logs.append("Initializing utility calculation engine...")
        
        # Ensure weights sum to 1.0
        total_weight = sum(weights.values())
        normalized_weights = {}
        if total_weight > 0:
            normalized_weights = {k: v / total_weight for k, v in weights.items()}
            logs.append(f"Normalized weights to sum to 1.0: {normalized_weights}")
        else:
            normalized_weights = {k: 1.0 / len(weights) for k in weights.keys()}
            logs.append(f"Weights were zero or empty. Distributed equally: {normalized_weights}")

        # Determine min and max for each criterion dynamically if not provided
        bounds = {}
        for crit_id, crit_info in criteria.items():
            c_min = crit_info.get("min")
            c_max = crit_info.get("max")
            c_type = crit_info.get("type", "benefit")
            
            # If not explicitly defined, scan alternatives
            if c_min is None or c_max is None:
                vals = [alt["values"].get(crit_id, 0.0) for alt in alternatives if "values" in alt]
                if vals:
                    c_min = min(vals) if c_min is None else c_min
                    c_max = max(vals) if c_max is None else c_max
                else:
                    c_min, c_max = 0.0, 1.0
            
            bounds[crit_id] = {"min": float(c_min), "max": float(c_max), "type": c_type}
        
        logs.append(f"Resolved criteria bounds: {bounds}")
        
        scored_alternatives = []
        for alt in alternatives:
            alt_id = alt["id"]
            alt_name = alt["name"]
            alt_vals = alt.get("values", {})
            
            utility_breakdown = {}
            total_utility = 0.0
            
            logs.append(f"Evaluating utility for alternative '{alt_name}'...")
            
            for crit_id, weight in normalized_weights.items():
                val = float(alt_vals.get(crit_id, 0.0))
                b = bounds[crit_id]
                
                norm = normalize_value(val, b["min"], b["max"], b["type"])
                weighted_norm = norm * weight
                total_utility += weighted_norm
                
                utility_breakdown[crit_id] = {
                    "raw": val,
                    "normalized": norm,
                    "weighted": weighted_norm,
                    "weight": weight
                }
                logs.append(
                    f"  Criterion '{crit_id}': raw={val}, norm={norm:.3f}, weighted={weighted_norm:.3f} (weight={weight:.2f})"
                )
                
            scored_alt = alt.copy()
            scored_alt["utility_score"] = total_utility
            scored_alt["utility_breakdown"] = utility_breakdown
            scored_alternatives.append(scored_alt)
            logs.append(f"Alternative '{alt_name}' final utility score: {total_utility:.4f}")
            
        return scored_alternatives, logs

    @staticmethod
    def analyze_tradeoffs(
        alt1: Dict[str, Any],
        alt2: Dict[str, Any],
        criteria: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyzes the trade-offs between two alternatives.
        Returns which is better in what, and the magnitude.
        """
        tradeoffs = {
            "alt1_better": [],
            "alt2_better": [],
            "conflicts": []
        }
        
        vals1 = alt1.get("values", {})
        vals2 = alt2.get("values", {})
        
        breakdown1 = alt1.get("utility_breakdown", {})
        breakdown2 = alt2.get("utility_breakdown", {})
        
        for crit_id, crit_info in criteria.items():
            val1 = float(vals1.get(crit_id, 0.0))
            val2 = float(vals2.get(crit_id, 0.0))
            c_type = crit_info.get("type", "benefit")
            
            # Retrieve weight-adjusted contributions if available, else look at raw differences
            norm1 = breakdown1.get(crit_id, {}).get("normalized", 0.5)
            norm2 = breakdown2.get(crit_id, {}).get("normalized", 0.5)
            weight = breakdown1.get(crit_id, {}).get("weight", 1.0)
            
            diff_raw = val1 - val2
            diff_utility = (norm1 - norm2) * weight
            
            # Determine which is better
            if c_type == "benefit":
                is_alt1_better = val1 > val2
            else:
                is_alt1_better = val1 < val2
                
            if abs(diff_raw) > 1e-9:
                item = {
                    "criterion": crit_id,
                    "name": crit_info.get("name", crit_id),
                    "alt1_value": val1,
                    "alt2_value": val2,
                    "diff_raw": diff_raw,
                    "diff_utility": diff_utility,
                    "type": c_type
                }
                if is_alt1_better:
                    tradeoffs["alt1_better"].append(item)
                else:
                    tradeoffs["alt2_better"].append(item)
                    
        # Check if they conflict (one is better on some criteria, other on others)
        if tradeoffs["alt1_better"] and tradeoffs["alt2_better"]:
            tradeoffs["conflicts"] = [
                f"{alt1['name']} is superior in {', '.join([c['name'] for c in tradeoffs['alt1_better']])}, but {alt2['name']} is superior in {', '.join([c['name'] for c in tradeoffs['alt2_better']])}."
            ]
            
        return tradeoffs
