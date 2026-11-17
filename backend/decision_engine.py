"""
decision_engine.py
Orchestrates the MCDSS intelligent agent using the PEAS model.
Acts as the central coordinator for CSP, A* Search, Utility calculations, and Explainability.
"""
import uuid
from typing import Dict, Any, List

from utility_calculator import UtilityCalculator
from constraint_solver import ConstraintSolver
from a_star_search import AStarSearch
from heuristic_engine import HeuristicEngine
from explainability_engine import ExplainabilityEngine


class DecisionEngine:
    """
    PEAS-based Intelligent Decision Agent.

    Performance: Maximize recommendation accuracy & constraint satisfaction.
    Environment: User-defined alternatives, criteria, weights, constraints.
    Actuators:   Ranked recommendations, charts data, PDF export, AI explanations.
    Sensors:     User inputs (alternatives, criteria, weights, constraints).
    """

    @staticmethod
    def run(payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point. Runs the full decision pipeline.
        Expected payload keys:
            decision_name  : str
            alternatives   : List[{id, name, values:{crit_id: float}}]
            criteria       : {crit_id: {name, type('benefit'|'cost'), min, max}}
            weights        : {crit_id: float}
            constraints    : [{criterion_id, operator, value}]
        """
        master_logs: List[str] = []
        trace_nodes: List[Dict] = []

        # ── Normalise & stamp alternatives ──────────────────────────
        decision_name = payload.get("decision_name", "Untitled Decision")
        alternatives: List[Dict] = payload.get("alternatives", [])
        criteria: Dict[str, Any] = payload.get("criteria", {})
        weights: Dict[str, float] = payload.get("weights", {})
        constraints: List[Dict] = payload.get("constraints", [])

        for alt in alternatives:
            if "id" not in alt:
                alt["id"] = str(uuid.uuid4())

        master_logs.append(f"[AGENT] Decision: '{decision_name}'")
        master_logs.append(f"[AGENT] Alternatives received: {[a['name'] for a in alternatives]}")
        master_logs.append(f"[AGENT] Criteria: {list(criteria.keys())}")
        master_logs.append(f"[AGENT] Constraints count: {len(constraints)}")

        # ── STEP 1 — Constraint Satisfaction (CSP) ──────────────────
        master_logs.append("[CSP] Running Constraint Satisfaction solver...")
        passed_alts, failed_alts, csp_logs = ConstraintSolver.solve(
            alternatives, constraints, criteria
        )
        master_logs.extend(csp_logs)
        master_logs.append(
            f"[CSP] Passed: {[a['name'] for a in passed_alts]} | "
            f"Failed: {[a['name'] for a in failed_alts]}"
        )

        # Use passed alternatives for search; fall back to all if everything failed
        search_pool = passed_alts if passed_alts else alternatives

        # ── STEP 2 — A* Search ──────────────────────────────────────
        master_logs.append("[A*] Initiating A* Search over candidate alternatives...")
        a_star_ranked, trace_nodes, a_star_logs = AStarSearch.search(
            search_pool, criteria, weights, constraints
        )
        master_logs.extend(a_star_logs)

        # ── STEP 3 — Utility Calculation (MAUT) ─────────────────────
        master_logs.append("[UTIL] Computing Multi-Attribute Utility Theory scores...")
        utility_scored, util_logs = UtilityCalculator.calculate_utilities(
            search_pool, criteria, weights
        )
        master_logs.extend(util_logs)

        # Merge utility breakdown back into A* ranked list
        util_map = {a["id"]: a for a in utility_scored}
        for alt in a_star_ranked:
            if alt["id"] in util_map:
                alt["utility_score"] = util_map[alt["id"]].get("utility_score", 0.0)
                alt["utility_breakdown"] = util_map[alt["id"]].get("utility_breakdown", {})

        # Also attach utility breakdown to failed alternatives
        for alt in failed_alts:
            u = UtilityCalculator.calculate_utilities([alt], criteria, weights)
            if u[0]:
                alt["utility_score"] = u[0][0].get("utility_score", 0.0)
                alt["utility_breakdown"] = u[0][0].get("utility_breakdown", {})

        # ── STEP 4 — Heuristic Confidence Scoring ───────────────────
        master_logs.append("[HEURISTIC] Calculating confidence & certainty scores...")
        confidence = HeuristicEngine.calculate_confidence_and_certainty(
            a_star_ranked, constraints, weights
        )
        weight_suggestions = HeuristicEngine.suggest_weight_balancing(weights)
        master_logs.append(
            f"[HEURISTIC] Certainty: {confidence['certainty_percentage']}% "
            f"({confidence['confidence_desc']})"
        )

        # ── STEP 5 — Explainability (Gemini / Rule-based) ───────────
        master_logs.append("[EXPLAIN] Generating AI explanations...")
        explanations = ExplainabilityEngine.generate_explanations(
            decision_name, a_star_ranked, failed_alts, criteria, weights, confidence
        )
        master_logs.append("[EXPLAIN] Explanations generated successfully.")

        # ── STEP 6 — Trade-off Analysis ─────────────────────────────
        tradeoffs = []
        if len(a_star_ranked) >= 2:
            master_logs.append("[TRADEOFF] Running pairwise trade-off analysis...")
            tradeoffs = UtilityCalculator.analyze_tradeoffs(
                a_star_ranked[0], a_star_ranked[1], criteria
            )

        # ── STEP 7 — Build Radar Chart Data ─────────────────────────
        radar_data = DecisionEngine._build_radar_data(utility_scored, criteria)

        # ── STEP 8 — Build Bar Chart Data ───────────────────────────
        bar_data = DecisionEngine._build_bar_data(a_star_ranked)

        master_logs.append("[AGENT] Decision pipeline complete.")

        return {
            "decision_name": decision_name,
            "ranked_alternatives": a_star_ranked,
            "failed_alternatives": failed_alts,
            "utility_scores": utility_scored,
            "criteria": criteria,
            "weights": weights,
            "constraints": constraints,
            "confidence": confidence,
            "weight_suggestions": weight_suggestions,
            "explanations": explanations,
            "tradeoffs": tradeoffs,
            "radar_data": radar_data,
            "bar_data": bar_data,
            "trace_nodes": trace_nodes,
            "logs": master_logs,
        }

    @staticmethod
    def _build_radar_data(utility_scored: List[Dict], criteria: Dict) -> List[Dict]:
        """Builds Recharts-compatible radar chart data."""
        crit_names = {cid: info.get("name", cid) for cid, info in criteria.items()}
        radar = []
        for crit_id, cname in crit_names.items():
            entry = {"criterion": cname}
            for alt in utility_scored:
                norm = alt.get("utility_breakdown", {}).get(crit_id, {}).get("normalized", 0.0)
                entry[alt["name"]] = round(norm * 100, 1)
            radar.append(entry)
        return radar

    @staticmethod
    def _build_bar_data(ranked: List[Dict]) -> List[Dict]:
        """Builds Recharts-compatible bar chart data for overall utility scores."""
        return [
            {
                "name": alt["name"],
                "utility": round(alt.get("search_rank_utility", alt.get("utility_score", 0.0)) * 100, 2),
                "status": alt.get("csp_status", "PASSED"),
            }
            for alt in ranked
        ]
