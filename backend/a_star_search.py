import heapq
from typing import List, Dict, Any, Tuple

class AStarNode:
    def __init__(self, alternative_id: str, alternative_name: str, step: int, g: float, h: float, path: List[str]):
        self.alternative_id = alternative_id
        self.alternative_name = alternative_name
        self.step = step  # Number of criteria evaluated so far
        self.g = g        # Path cost (cumulative weighted loss so far)
        self.h = h        # Heuristic (optimistic estimate of remaining weighted loss)
        self.f = g + h    # Total estimated cost
        self.path = path  # Criteria evaluated so far

    def __lt__(self, other: 'AStarNode') -> bool:
        # For priority queue: lower f value is prioritized.
        # If f values are equal, prioritize deeper nodes (higher step count)
        if abs(self.f - other.f) < 1e-9:
            return self.step > other.step
        return self.f < other.f

    def to_dict(self) -> Dict[str, Any]:
        return {
            "alternative_id": self.alternative_id,
            "alternative_name": self.alternative_name,
            "step": self.step,
            "g": round(self.g, 4),
            "h": round(self.h, 4),
            "f": round(self.f, 4),
            "path": self.path
        }

class AStarSearch:
    @staticmethod
    def search(
        alternatives: List[Dict[str, Any]],
        criteria: Dict[str, Dict[str, Any]],
        weights: Dict[str, float],
        constraints: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        """
        Executes an A* Search to find and rank alternatives.
        - g(n) is the cumulative weighted loss (1 - normalized_utility) for evaluated criteria.
        - h(n) is the minimum remaining loss across all options (admissible heuristic).
        - If a constraint is violated, the state is pruned immediately.
        Returns:
            - ranked_alternatives: List of alternatives sorted by final utility.
            - trace_nodes: Record of all states visited during A* search (open/closed logs).
            - logs: String messages of search steps.
        """
        logs = []
        trace_nodes = []
        logs.append("Initializing A* Search Module...")
        
        if not alternatives:
            logs.append("[WARNING] No alternatives to search.")
            return [], [], logs

        # Criteria list for ordered step-by-step evaluation
        criteria_list = list(criteria.keys())
        total_steps = len(criteria_list)
        logs.append(f"Search depth defined by {total_steps} criteria: {criteria_list}")

        # Compute normalized weights
        total_weight = sum(weights.values())
        norm_weights = {k: v / total_weight if total_weight > 0 else 1.0 / len(weights) for k, v in weights.items()}
        
        # Calculate utility details for heuristic estimation
        # We need normalized values for all alternatives
        bounds = {}
        for crit_id, crit_info in criteria.items():
            vals = [alt["values"].get(crit_id, 0.0) for alt in alternatives if "values" in alt]
            c_min = crit_info.get("min", min(vals) if vals else 0.0)
            c_max = crit_info.get("max", max(vals) if vals else 1.0)
            bounds[crit_id] = {
                "min": float(c_min),
                "max": float(c_max),
                "type": crit_info.get("type", "benefit")
            }

        # Precompute individual losses: L_c = weight_c * (1 - normalized_utility)
        losses = {}
        for alt in alternatives:
            alt_id = alt["id"]
            losses[alt_id] = {}
            for crit_id in criteria_list:
                val = float(alt["values"].get(crit_id, 0.0))
                b = bounds[crit_id]
                
                # Normalization
                if abs(b["max"] - b["min"]) < 1e-9:
                    norm_utility = 1.0
                else:
                    if b["type"] == "benefit":
                        norm_utility = (val - b["min"]) / (b["max"] - b["min"])
                    else:
                        norm_utility = (b["max"] - val) / (b["max"] - b["min"])
                norm_utility = max(0.0, min(1.0, norm_utility))
                
                # Loss
                losses[alt_id][crit_id] = norm_weights[crit_id] * (1.0 - norm_utility)

        # Precompute heuristic parts: h_min for each criterion (the minimum loss among any alternative)
        h_min = {}
        for crit_id in criteria_list:
            h_min[crit_id] = min(losses[alt_id][crit_id] for alt_id in losses)

        # Parse constraints for early pruning in search
        from constraint_solver import Constraint
        parsed_constraints = [Constraint(c["criterion_id"], c["operator"], float(c["value"])) for c in constraints]

        def satisfies_constraints_up_to(alt_values: Dict[str, float], step: int) -> Tuple[bool, str]:
            # Check only the criteria evaluated up to 'step'
            for c_idx in range(step):
                crit_id = criteria_list[c_idx]
                val = alt_values.get(crit_id, 0.0)
                for constr in parsed_constraints:
                    if constr.criterion_id == crit_id:
                        if not constr.check(val):
                            return False, f"Criterion '{crit_id}'={val} violates constraint '{constr.name}'"
            return True, ""

        # Priority Queue for A*
        open_set: List[AStarNode] = []
        closed_set = set() # Set of (alternative_id, step)

        # Initialize: push starting state for each alternative
        for alt in alternatives:
            alt_id = alt["id"]
            # h(0) is the sum of minimum losses for all criteria
            h0 = sum(h_min[c] for c in criteria_list)
            start_node = AStarNode(alt_id, alt["name"], 0, 0.0, h0, [])
            heapq.heappush(open_set, start_node)
            logs.append(f"Queued start node for '{alt['name']}' (f={start_node.f:.4f}, g=0, h={h0:.4f})")

        goal_nodes: List[AStarNode] = []
        step_counter = 0

        while open_set:
            step_counter += 1
            # Pop node with lowest f
            current = heapq.heappop(open_set)
            node_state = (current.alternative_id, current.step)
            
            trace_entry = {
                "iteration": step_counter,
                "action": "POP",
                "node": current.to_dict(),
                "open_set_size": len(open_set) + 1
            }
            trace_nodes.append(trace_entry)

            logs.append(f"Iteration {step_counter}: Popped state for '{current.alternative_name}' at step {current.step}/{total_steps} (f={current.f:.4f})")

            if node_state in closed_set:
                logs.append(f"  State {node_state} already evaluated. Skipping.")
                continue

            closed_set.add(node_state)

            # Check if this is a goal state (all criteria evaluated)
            if current.step == total_steps:
                logs.append(f"  [GOAL] Reachable goal state for '{current.alternative_name}'! Final loss: {current.g:.4f}")
                goal_nodes.append(current)
                # Keep searching to find ranks for other alternatives
                continue

            # Expand state: evaluate the next criterion
            next_crit = criteria_list[current.step]
            alt_data = next(a for a in alternatives if a["id"] == current.alternative_id)
            alt_vals = alt_data.get("values", {})
            
            # Transition details
            next_step = current.step + 1
            
            # Perform early constraint pruning
            passed_constraints, prune_reason = satisfies_constraints_up_to(alt_vals, next_step)
            if not passed_constraints:
                logs.append(f"  [PRUNED] '{current.alternative_name}' pruned at step {next_step} because: {prune_reason}")
                trace_nodes.append({
                    "iteration": step_counter,
                    "action": "PRUNE",
                    "alternative_name": current.alternative_name,
                    "reason": prune_reason,
                    "node": current.to_dict()
                })
                continue

            # Update g: add loss of the evaluated criterion
            loss_increment = losses[current.alternative_id][next_crit]
            next_g = current.g + loss_increment
            
            # Update h: subtract h_min of evaluated criterion
            next_h = current.h - h_min[next_crit]
            
            next_path = current.path + [next_crit]
            
            child_node = AStarNode(
                current.alternative_id,
                current.alternative_name,
                next_step,
                next_g,
                next_h,
                next_path
            )
            
            heapq.heappush(open_set, child_node)
            logs.append(f"  Expanded -> Step {next_step}: evaluated '{next_crit}'. New f={child_node.f:.4f} (g={child_node.g:.4f}, h={child_node.h:.4f})")
            
            trace_nodes.append({
                "iteration": step_counter,
                "action": "PUSH",
                "node": child_node.to_dict()
            })

        logs.append("A* Search completed.")
        
        # Format output
        # Reconstruct final ranked list based on utility: utility = 1 - final loss (g at leaf)
        ranked_results = []
        for g_node in goal_nodes:
            alt_info = next(a for a in alternatives if a["id"] == g_node.alternative_id)
            final_utility = 1.0 - g_node.g
            result = alt_info.copy()
            result["search_rank_utility"] = final_utility
            ranked_results.append(result)
            
        # Sort final results descending by search utility
        ranked_results.sort(key=lambda x: x["search_rank_utility"], reverse=True)
        
        return ranked_results, trace_nodes, logs
