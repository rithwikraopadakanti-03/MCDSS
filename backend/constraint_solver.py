from typing import List, Dict, Any, Tuple

class Constraint:
    def __init__(self, criterion_id: str, operator: str, limit_value: float, name: str = ""):
        self.criterion_id = criterion_id
        self.operator = operator  # '<', '>', '<=', '>=', '==', '!='
        self.limit_value = float(limit_value)
        self.name = name or f"{criterion_id} {operator} {limit_value}"

    def check(self, value: float) -> bool:
        if self.operator == "<":
            return value < self.limit_value
        elif self.operator == ">":
            return value > self.limit_value
        elif self.operator == "<=":
            return value <= self.limit_value
        elif self.operator == ">=":
            return value >= self.limit_value
        elif self.operator == "==":
            return abs(value - self.limit_value) < 1e-9
        elif self.operator == "!=":
            return abs(value - self.limit_value) > 1e-9
        return True

    def get_description(self, criteria_info: Dict[str, Any]) -> str:
        crit_name = criteria_info.get("name", self.criterion_id)
        return f"{crit_name} must be {self.operator} {self.limit_value}"

class ConstraintSolver:
    @staticmethod
    def solve(
        alternatives: List[Dict[str, Any]],
        constraints_list: List[Dict[str, Any]],
        criteria: Dict[str, Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        """
        Evaluates and filters alternatives based on constraints.
        Returns:
            - passed_alternatives: List of alternatives that satisfied all constraints.
            - failed_alternatives: List of alternatives with their violations details.
            - logs: Audit trace logs of CSP execution.
        """
        logs = []
        logs.append("Initializing Constraint Satisfaction Solver (CSP)...")
        
        # Parse constraints
        parsed_constraints: List[Constraint] = []
        for c in constraints_list:
            crit_id = c["criterion_id"]
            op = c["operator"]
            limit = float(c["value"])
            parsed_constraints.append(Constraint(crit_id, op, limit))
            
        logs.append(f"Loaded {len(parsed_constraints)} constraints: {[c.name for c in parsed_constraints]}")
        
        passed_alternatives = []
        failed_alternatives = []
        
        for alt in alternatives:
            alt_id = alt["id"]
            alt_name = alt["name"]
            alt_vals = alt.get("values", {})
            
            violations = []
            logs.append(f"Checking constraints for alternative '{alt_name}'...")
            
            for constraint in parsed_constraints:
                crit_id = constraint.criterion_id
                val = float(alt_vals.get(crit_id, 0.0))
                
                if not constraint.check(val):
                    crit_info = criteria.get(crit_id, {})
                    desc = constraint.get_description(crit_info)
                    violation_detail = {
                        "criterion_id": crit_id,
                        "criterion_name": crit_info.get("name", crit_id),
                        "constraint_desc": desc,
                        "actual_value": val,
                        "required_operator": constraint.operator,
                        "required_limit": constraint.limit_value
                    }
                    violations.append(violation_detail)
                    logs.append(f"  [FAILED] '{alt_name}' violated constraint: {desc} (Actual: {val})")
                else:
                    logs.append(f"  [PASSED] '{alt_name}' satisfied constraint: {constraint.name}")
            
            scored_alt = alt.copy()
            if not violations:
                scored_alt["csp_status"] = "PASSED"
                scored_alt["violations"] = []
                passed_alternatives.append(scored_alt)
                logs.append(f"Alternative '{alt_name}' successfully satisfied all constraints.")
            else:
                scored_alt["csp_status"] = "FAILED"
                scored_alt["violations"] = violations
                failed_alternatives.append(scored_alt)
                logs.append(f"Alternative '{alt_name}' rejected due to {len(violations)} constraint violations.")
                
        # Min-Conflicts Check if all alternatives failed
        if not passed_alternatives and alternatives:
            logs.append("[WARNING] All alternatives failed the constraints! Running Min-Conflicts Local Search to resolve...")
            min_conflict_alts = ConstraintSolver.run_min_conflicts(alternatives, parsed_constraints, criteria)
            logs.append(f"Min-Conflicts search recommended options with minimal conflicts: {[a['name'] for a in min_conflict_alts]}")
            
        return passed_alternatives, failed_alternatives, logs

    @staticmethod
    def run_min_conflicts(
        alternatives: List[Dict[str, Any]],
        constraints: List[Constraint],
        criteria: Dict[str, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Runs Min-Conflicts style evaluation: ranks alternatives by the minimum number of conflict violations
        and details how they can be relaxed.
        """
        scored_alts = []
        for alt in alternatives:
            alt_vals = alt.get("values", {})
            violations = []
            for c in constraints:
                val = float(alt_vals.get(c.criterion_id, 0.0))
                if not c.check(val):
                    crit_info = criteria.get(c.criterion_id, {})
                    violations.append({
                        "criterion_id": c.criterion_id,
                        "criterion_name": crit_info.get("name", c.criterion_id),
                        "constraint_desc": c.get_description(crit_info),
                        "actual_value": val,
                        "difference": abs(val - c.limit_value)
                    })
            
            scored_alt = alt.copy()
            scored_alt["conflict_count"] = len(violations)
            scored_alt["violations"] = violations
            scored_alts.append(scored_alt)
            
        # Sort by conflict count ascending, then by difference magnitude
        scored_alts.sort(key=lambda x: (x["conflict_count"], sum(v["difference"] for v in x["violations"])))
        return scored_alts
