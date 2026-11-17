import React, { useState, useEffect } from "react";
import { Plus, Trash2, Cpu, Sparkles, HelpCircle, Save, Sliders, List, ShieldAlert, Check } from "lucide-react";
import VoiceInputButton from "../components/VoiceInputButton";

export default function DecisionCreation({ decisionState, setDecisionState, onNavigate }) {
  const [activeTab, setActiveTab] = useState("criteria"); // criteria | alternatives | constraints
  const [category, setCategory] = useState(decisionState.category || "");
  const [decisionName, setDecisionName] = useState(decisionState.decision_name || "Choose Best Option");
  const [criteria, setCriteria] = useState(decisionState.criteria || {});
  const [weights, setWeights] = useState(decisionState.weights || {});
  const [alternatives, setAlternatives] = useState(decisionState.alternatives || []);
  const [constraints, setConstraints] = useState(decisionState.constraints || []);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Sync state upward when local state variables change
  useEffect(() => {
    setDecisionState({
      decision_name: decisionName,
      category,
      criteria,
      weights,
      alternatives,
      constraints
    });
  }, [decisionName, category, criteria, weights, alternatives, constraints]);

  // ── Criteria Logic ──────────────────────────────────────────────────
  const handleAddCriterion = () => {
    const key = `crit_${Date.now()}`;
    const newCriteria = {
      ...criteria,
      [key]: { name: "New Criterion", type: "benefit", min: 0, max: 100 }
    };
    setCriteria(newCriteria);
    
    // Assign weight
    const keys = Object.keys(newCriteria);
    const defaultWeight = 1 / keys.length;
    const newWeights = {};
    keys.forEach(k => {
      newWeights[k] = defaultWeight;
    });
    setWeights(newWeights);

    // Initialise values for all existing alternatives
    setAlternatives(alternatives.map(alt => ({
      ...alt,
      values: { ...alt.values, [key]: 0 }
    })));
  };

  const handleRemoveCriterion = (key) => {
    const newCriteria = { ...criteria };
    delete newCriteria[key];
    setCriteria(newCriteria);

    const newWeights = { ...weights };
    delete newWeights[key];
    
    // Re-normalize weights
    const keys = Object.keys(newCriteria);
    if (keys.length > 0) {
      const sum = Object.values(newWeights).reduce((a, b) => a + b, 0);
      keys.forEach(k => {
        newWeights[k] = sum > 0 ? newWeights[k] / sum : 1 / keys.length;
      });
    }
    setWeights(newWeights);

    // Remove from alternatives values
    setAlternatives(alternatives.map(alt => {
      const newVals = { ...alt.values };
      delete newVals[key];
      return { ...alt, values: newVals };
    }));

    // Remove matching constraints
    setConstraints(constraints.filter(c => c.criterion_id !== key));
  };

  const handleUpdateCriterion = (key, field, val) => {
    setCriteria({
      ...criteria,
      [key]: { ...criteria[key], [field]: val }
    });
  };

  const handleWeightChange = (key, newWeight) => {
    const keys = Object.keys(criteria);
    if (keys.length <= 1) return;

    const diff = newWeight - weights[key];
    const newWeights = { ...weights, [key]: newWeight };
    
    // Distribute the difference proportionally among other weights
    const remainingSum = keys.filter(k => k !== key).reduce((sum, k) => sum + weights[k], 0);
    
    keys.forEach(k => {
      if (k !== key) {
        if (remainingSum > 0) {
          const ratio = weights[k] / remainingSum;
          newWeights[k] = Math.max(0, weights[k] - diff * ratio);
        } else {
          newWeights[k] = Math.max(0, (1 - newWeight) / (keys.length - 1));
        }
      }
    });

    // Re-normalize just to prevent floating precision drifts
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    keys.forEach(k => {
      newWeights[k] = newWeights[k] / total;
    });

    setWeights(newWeights);
  };

  const handleSuggestCriteria = async () => {
    if (!category.trim()) {
      setValidationError("Please specify a category to suggest criteria.");
      return;
    }
    setIsSuggesting(true);
    setValidationError("");
    try {
      const res = await fetch("http://localhost:8000/api/suggest-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category })
      });
      if (!res.ok) throw new Error("Suggestion failed");
      const data = await res.json();
      
      setCriteria(data.criteria);
      
      // Load suggested weights
      const newWeights = {};
      Object.entries(data.criteria).forEach(([k, c]) => {
        newWeights[k] = c.weight || 1 / Object.keys(data.criteria).length;
      });
      setWeights(newWeights);
      
      // Update alternatives keys
      setAlternatives(alternatives.map(alt => {
        const newVals = {};
        Object.keys(data.criteria).forEach(k => {
          newVals[k] = alt.values[k] || 0;
        });
        return { ...alt, values: newVals };
      }));
    } catch (err) {
      console.error(err);
      setValidationError("Failed to fetch criteria suggestions from AI. Using fallbacks.");
    } finally {
      setIsSuggesting(false);
    }
  };

  // ── Alternatives Logic ─────────────────────────────────────────────
  const handleAddAlternative = () => {
    const initialValues = {};
    Object.keys(criteria).forEach(k => {
      initialValues[k] = 0;
    });
    setAlternatives([
      ...alternatives,
      { id: `alt_${Date.now()}`, name: `Alternative ${alternatives.length + 1}`, values: initialValues }
    ]);
  };

  const handleRemoveAlternative = (id) => {
    setAlternatives(alternatives.filter(alt => alt.id !== id));
  };

  const handleUpdateAlternativeName = (id, newName) => {
    setAlternatives(alternatives.map(alt => alt.id === id ? { ...alt, name: newName } : alt));
  };

  const handleUpdateAlternativeValue = (id, critKey, val) => {
    setAlternatives(alternatives.map(alt => {
      if (alt.id === id) {
        return {
          ...alt,
          values: {
            ...alt.values,
            [critKey]: parseFloat(val) || 0
          }
        };
      }
      return alt;
    }));
  };

  // ── Constraints Logic ──────────────────────────────────────────────
  const handleAddConstraint = () => {
    const critKeys = Object.keys(criteria);
    if (critKeys.length === 0) return;
    setConstraints([
      ...constraints,
      { criterion_id: critKeys[0], operator: "<", value: 0 }
    ]);
  };

  const handleRemoveConstraint = (index) => {
    setConstraints(constraints.filter((_, idx) => idx !== index));
  };

  const handleUpdateConstraint = (index, field, val) => {
    const updated = [...constraints];
    if (field === "value") {
      updated[index][field] = parseFloat(val) || 0;
    } else {
      updated[index][field] = val;
    }
    setConstraints(updated);
  };

  // ── Voice Extraction Integration ──────────────────────────────────
  const handleVoiceDataExtracted = (extracted, transcript) => {
    if (extracted.decision_name) setDecisionName(extracted.decision_name);
    if (extracted.criteria) {
      setCriteria(extracted.criteria);
      const newWeights = {};
      Object.entries(extracted.criteria).forEach(([k, c]) => {
        newWeights[k] = c.weight || 0.25;
      });
      setWeights(newWeights);
    }
    if (extracted.alternatives) {
      // Create initial objects for alternatives list
      const cleanAlts = extracted.alternatives.map((name, i) => {
        const vals = {};
        Object.keys(extracted.criteria || criteria).forEach(k => {
          vals[k] = 0;
        });
        return { id: `alt_${Date.now()}_${i}`, name, values: vals };
      });
      setAlternatives(cleanAlts);
    }
    if (extracted.constraints) setConstraints(extracted.constraints);
  };

  // ── Execute Pipeline ──────────────────────────────────────────────
  const handleDecide = async () => {
    setValidationError("");
    if (alternatives.length === 0) {
      setValidationError("Add at least one alternative to rank.");
      return;
    }
    if (Object.keys(criteria).length === 0) {
      setValidationError("Add at least one evaluation criterion.");
      return;
    }

    try {
      const payload = {
        decision_name: decisionName,
        alternatives,
        criteria,
        weights,
        constraints
      };
      
      const res = await fetch("http://localhost:8000/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error("Decision engine failed to compute ranks.");
      }
      
      const result = await res.json();
      
      // Save result state to localStorage
      localStorage.setItem("mcdss_active_results", JSON.stringify(result));
      
      // Save input history
      const historySaved = localStorage.getItem("mcdss_history");
      const historyArr = historySaved ? JSON.parse(historySaved) : [];
      const newHistoryItem = {
        decision_name: decisionName,
        category: category || "General",
        timestamp: new Date().toLocaleString(),
        input_state: payload,
        result_state: result
      };
      
      // Deduplicate by name and prepend
      const filteredHistory = historyArr.filter(h => h.decision_name !== decisionName);
      localStorage.setItem("mcdss_history", JSON.stringify([newHistoryItem, ...filteredHistory]));

      onNavigate("results");
    } catch (err) {
      console.error(err);
      setValidationError("Error evaluating ranking: Make sure FastAPI backend is running.");
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full px-4 py-8">
      {/* Header Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex-1 flex flex-col gap-3 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block mb-1">Decision Name</label>
              <input
                type="text"
                value={decisionName}
                onChange={(e) => setDecisionName(e.target.value)}
                className="w-full bg-cyber-dark border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/20"
                placeholder="e.g. Select Gaming Laptop"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block mb-1">Decision Category</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 bg-cyber-dark border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/20"
                  placeholder="e.g. Laptop, College, Travel"
                />
                <button
                  onClick={handleSuggestCriteria}
                  disabled={isSuggesting || !category}
                  className="px-4 bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20 rounded-xl hover:bg-neon-cyan hover:text-black transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-40"
                >
                  {isSuggesting ? (
                    <span className="w-4 h-4 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Suggest
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Speech Assistant Panel */}
        <div className="flex items-center gap-4 border-l border-white/5 pl-0 md:pl-6 w-full md:w-auto">
          <div>
            <span className="text-[10px] text-gray-500 font-mono uppercase block mb-1">Voice setup</span>
            <VoiceInputButton onDataExtracted={handleVoiceDataExtracted} />
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-white/15">
        <button
          onClick={() => setActiveTab("criteria")}
          className={`flex items-center gap-2 px-6 py-3 font-orbitron font-semibold text-xs uppercase tracking-wider border-b-2 transition ${
            activeTab === "criteria"
              ? "border-neon-purple text-neon-purple"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Sliders className="w-4 h-4" /> 1. Criteria & Weights
        </button>
        <button
          onClick={() => setActiveTab("alternatives")}
          className={`flex items-center gap-2 px-6 py-3 font-orbitron font-semibold text-xs uppercase tracking-wider border-b-2 transition ${
            activeTab === "alternatives"
              ? "border-neon-blue text-neon-blue"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <List className="w-4 h-4" /> 2. Alternatives & Attributes
        </button>
        <button
          onClick={() => setActiveTab("constraints")}
          className={`flex items-center gap-2 px-6 py-3 font-orbitron font-semibold text-xs uppercase tracking-wider border-b-2 transition ${
            activeTab === "constraints"
              ? "border-neon-pink text-neon-pink"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> 3. CSP Constraints
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1">
        {/* Tab 1: Criteria & Weights */}
        {activeTab === "criteria" && (
          <div className="flex flex-col gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold font-orbitron text-white uppercase tracking-wider">
                  Criteria Specifications
                </h3>
                <button
                  onClick={handleAddCriterion}
                  className="px-3 py-1.5 bg-neon-purple/15 text-neon-purple border border-neon-purple/25 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 hover:bg-neon-purple hover:text-white transition"
                >
                  <Plus className="w-4 h-4" /> Add Criterion
                </button>
              </div>

              {Object.keys(criteria).length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No criteria defined. Add custom criteria or click "Suggest" in the category field above.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {Object.entries(criteria).map(([key, item]) => (
                    <div
                      key={key}
                      className="bg-black/20 border border-white/5 p-4 rounded-xl grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
                    >
                      <div className="lg:col-span-3">
                        <label className="text-[10px] text-gray-500 font-mono uppercase block mb-1">Criterion Name</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateCriterion(key, "name", e.target.value)}
                          className="w-full bg-cyber-dark border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neon-purple"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label className="text-[10px] text-gray-500 font-mono uppercase block mb-1">Optimization Goal</label>
                        <select
                          value={item.type}
                          onChange={(e) => handleUpdateCriterion(key, "type", e.target.value)}
                          className="w-full bg-cyber-dark border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-neon-purple"
                        >
                          <option value="benefit">Benefit (Higher is Better)</option>
                          <option value="cost">Cost (Lower is Better)</option>
                        </select>
                      </div>

                      <div className="lg:col-span-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 font-mono uppercase block mb-1">Min Bounds</label>
                          <input
                            type="number"
                            value={item.min}
                            onChange={(e) => handleUpdateCriterion(key, "min", parseFloat(e.target.value) || 0)}
                            className="w-full bg-cyber-dark border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-mono uppercase block mb-1">Max Bounds</label>
                          <input
                            type="number"
                            value={item.max}
                            onChange={(e) => handleUpdateCriterion(key, "max", parseFloat(e.target.value) || 0)}
                            className="w-full bg-cyber-dark border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="lg:col-span-4">
                        <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                          <span>Importance Weight</span>
                          <span className="text-neon-purple font-semibold">{(weights[key] * 100).toFixed(0)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.01"
                          max="0.99"
                          step="0.01"
                          value={weights[key] || 0.25}
                          onChange={(e) => handleWeightChange(key, parseFloat(e.target.value))}
                          className="w-full accent-neon-purple bg-cyber-dark h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="lg:col-span-1 flex justify-center pt-4 lg:pt-0">
                        <button
                          onClick={() => handleRemoveCriterion(key)}
                          className="p-2 bg-neon-pink/10 hover:bg-neon-pink text-neon-pink hover:text-white rounded-lg border border-neon-pink/20 hover:border-transparent transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Alternatives & Attributes */}
        {activeTab === "alternatives" && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold font-orbitron text-white uppercase tracking-wider">
                Candidates Matrix
              </h3>
              <button
                onClick={handleAddAlternative}
                className="px-3 py-1.5 bg-neon-blue/15 text-neon-blue border border-neon-blue/25 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 hover:bg-neon-blue hover:text-white transition"
              >
                <Plus className="w-4 h-4" /> Add Candidate
              </button>
            </div>

            {Object.keys(criteria).length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                Define criteria first to populate parameters inputs.
              </div>
            ) : alternatives.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No candidates created. Click "Add Candidate" to begin.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 font-mono uppercase">
                      <th className="py-3 px-4 min-w-[200px]">Candidate Name</th>
                      {Object.entries(criteria).map(([key, item]) => (
                        <th key={key} className="py-3 px-4 min-w-[120px]">
                          {item.name}
                          <span className="block text-[9px] text-gray-600 font-normal">
                            ({item.type === "benefit" ? "max" : "min"})
                          </span>
                        </th>
                      ))}
                      <th className="py-3 px-4 w-16 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alternatives.map((alt) => (
                      <tr key={alt.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={alt.name}
                            onChange={(e) => handleUpdateAlternativeName(alt.id, e.target.value)}
                            className="bg-cyber-dark border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none w-full font-semibold"
                          />
                        </td>
                        {Object.keys(criteria).map((critKey) => (
                          <td key={critKey} className="py-3 px-4">
                            <input
                              type="number"
                              value={alt.values[critKey] ?? 0}
                              onChange={(e) => handleUpdateAlternativeValue(alt.id, critKey, e.target.value)}
                              className="bg-cyber-dark border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none w-full"
                            />
                          </td>
                        ))}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleRemoveAlternative(alt.id)}
                            className="p-1.5 bg-neon-pink/10 hover:bg-neon-pink text-neon-pink hover:text-white rounded border border-neon-pink/20 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: CSP Constraints */}
        {activeTab === "constraints" && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold font-orbitron text-white uppercase tracking-wider">
                Constraint Satisfaction Rules
              </h3>
              <button
                onClick={handleAddConstraint}
                disabled={Object.keys(criteria).length === 0}
                className="px-3 py-1.5 bg-neon-pink/15 text-neon-pink border border-neon-pink/25 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 hover:bg-neon-pink hover:text-white transition disabled:opacity-40"
              >
                <Plus className="w-4 h-4" /> Add Constraint
              </button>
            </div>

            {Object.keys(criteria).length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                Define criteria first to formulate constraints.
              </div>
            ) : constraints.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No constraints active. Candidates will bypass pruning filters.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {constraints.map((c, index) => (
                  <div
                    key={index}
                    className="bg-black/20 border border-white/5 p-3 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    <div className="sm:col-span-5">
                      <label className="text-[10px] text-gray-500 font-mono uppercase block mb-1">Target Criterion</label>
                      <select
                        value={c.criterion_id}
                        onChange={(e) => handleUpdateConstraint(index, "criterion_id", e.target.value)}
                        className="w-full bg-cyber-dark border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      >
                        {Object.entries(criteria).map(([key, item]) => (
                          <option key={key} value={key}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-gray-500 font-mono uppercase block mb-1">Operator</label>
                      <select
                        value={c.operator}
                        onChange={(e) => handleUpdateConstraint(index, "operator", e.target.value)}
                        className="w-full bg-cyber-dark border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                      >
                        <option value="<">&lt; Less Than</option>
                        <option value="<=">&le; Less Than/Equal</option>
                        <option value=">">&gt; Greater Than</option>
                        <option value=">=">&ge; Greater Than/Equal</option>
                        <option value="==">= Equal</option>
                        <option value="!=">&ne; Not Equal</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-gray-500 font-mono uppercase block mb-1">Threshold Value</label>
                      <input
                        type="number"
                        value={c.value}
                        onChange={(e) => handleUpdateConstraint(index, "value", e.target.value)}
                        className="w-full bg-cyber-dark border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-center pt-2 sm:pt-0">
                      <button
                        onClick={() => handleRemoveConstraint(index)}
                        className="p-2 bg-neon-pink/10 hover:bg-neon-pink text-neon-pink hover:text-white rounded-lg border border-neon-pink/20 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Validation and Solvers trigger */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-left">
          {validationError && (
            <p className="text-neon-pink font-semibold font-mono text-xs flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> {validationError}
            </p>
          )}
          {!validationError && (
            <p className="text-xs text-gray-400">
              Form updates are saved locally. Click Solve to trigger A* search optimizations.
            </p>
          )}
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={() => onNavigate("dashboard")}
            className="px-6 py-2.5 bg-cyber-dark text-gray-400 border border-gray-800 rounded-xl hover:text-white transition uppercase font-semibold text-xs tracking-wider font-orbitron"
          >
            Cancel
          </button>
          <button
            onClick={handleDecide}
            className="px-8 py-2.5 bg-neon-cyan hover:bg-white text-black rounded-xl font-bold uppercase tracking-widest text-xs font-orbitron shadow-[0_0_15px_rgba(0,240,255,0.35)] flex items-center gap-1.5"
          >
            <Cpu className="w-4 h-4" /> Run Decision Pipeline
          </button>
        </div>
      </div>
    </div>
  );
}
