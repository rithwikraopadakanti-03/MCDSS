import React, { useState, useEffect } from "react";
import { Scale, Check, X, ShieldAlert, ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Comparison({ onNavigate }) {
  const [results, setResults] = useState(null);
  const [candidateA, setCandidateA] = useState("");
  const [candidateB, setCandidateB] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("mcdss_active_results");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setResults(parsed);
        
        // Default candidates to the top 2 ranked alternatives if available
        const ranked = parsed.ranked_alternatives || [];
        if (ranked.length >= 2) {
          setCandidateA(ranked[0].id);
          setCandidateB(ranked[1].id);
        } else if (ranked.length === 1) {
          setCandidateA(ranked[0].id);
        }
      } catch (err) {
        console.error("Error reading results in Comparison:", err);
      }
    }
  }, []);

  if (!results) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Scale className="w-16 h-16 text-gray-700 mb-4 animate-pulse" />
        <h3 className="font-orbitron font-extrabold text-lg text-white uppercase tracking-wider">
          No active decision data
        </h3>
        <p className="text-gray-500 text-xs mt-1">Run a comparison pipeline to enable pairwise checks.</p>
      </div>
    );
  }

  const allAlternatives = [...(results.ranked_alternatives || []), ...(results.failed_alternatives || [])];
  const criteria = results.criteria || {};
  const weights = results.weights || {};

  const altA = allAlternatives.find(a => a.id === candidateA);
  const altB = allAlternatives.find(a => a.id === candidateB);

  // Compute tradeoffs locally if candidates change or retrieve from results if comparing top 2
  const getCompareStats = () => {
    if (!altA || !altB) return [];

    return Object.entries(criteria).map(([key, crit]) => {
      const valA = altA.values[key] ?? 0;
      const valB = altB.values[key] ?? 0;
      const diff = valA - valB;
      
      let isWinner = null; // 'A' | 'B' | null
      if (crit.type === "benefit") {
        if (diff > 0) isWinner = "A";
        else if (diff < 0) isWinner = "B";
      } else {
        if (diff < 0) isWinner = "A";
        else if (diff > 0) isWinner = "B";
      }

      return {
        key,
        name: crit.name,
        type: crit.type,
        weight: weights[key] || 0.25,
        valA,
        valB,
        diff: Math.abs(diff),
        isWinner
      };
    });
  };

  const comparisonRows = getCompareStats();

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          <h2 className="font-orbitron font-extrabold text-2xl text-white uppercase tracking-wider flex items-center gap-2">
            <Scale className="w-6 h-6 text-neon-blue" /> Pairwise Comparison Matrix
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Compare attributes side-by-side with calculated wins and trade-offs.
          </p>
        </div>
        <button
          onClick={() => onNavigate("results")}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white uppercase tracking-wider font-orbitron transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Results
        </button>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-cyber-dark/40 border border-white/5 p-6 rounded-2xl">
        <div>
          <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block mb-1">Candidate A</label>
          <select
            value={candidateA}
            onChange={(e) => setCandidateA(e.target.value)}
            className="w-full bg-cyber-dark border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-cyan"
          >
            <option value="">Select Candidate...</option>
            {allAlternatives.map((alt) => (
              <option key={alt.id} value={alt.id}>
                {alt.name} {alt.csp_status === "FAILED" ? "(CSP FAILED)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block mb-1">Candidate B</label>
          <select
            value={candidateB}
            onChange={(e) => setCandidateB(e.target.value)}
            className="w-full bg-cyber-dark border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-pink"
          >
            <option value="">Select Candidate...</option>
            {allAlternatives.map((alt) => (
              <option key={alt.id} value={alt.id}>
                {alt.name} {alt.csp_status === "FAILED" ? "(CSP FAILED)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Matrix Table */}
      {altA && altB ? (
        <div className="flex flex-col gap-6">
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-black/10 text-gray-400 font-mono uppercase text-xs">
                  <th className="py-4 px-6">Evaluation Criteria</th>
                  <th className="py-4 px-6 text-neon-cyan font-bold">{altA.name}</th>
                  <th className="py-4 px-6 text-neon-pink font-bold">{altB.name}</th>
                  <th className="py-4 px-6 text-center">Differential</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="py-4 px-6">
                      <span className="font-semibold text-gray-200 block">{row.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        Weight: {(row.weight * 100).toFixed(0)}% | {row.type}
                      </span>
                    </td>
                    <td className={`py-4 px-6 font-mono text-sm ${
                      row.isWinner === "A" ? "text-neon-cyan font-bold bg-neon-cyan/5" : "text-gray-400"
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {row.isWinner === "A" && <Check className="w-4 h-4 text-neon-cyan" />}
                        {row.valA}
                      </div>
                    </td>
                    <td className={`py-4 px-6 font-mono text-sm ${
                      row.isWinner === "B" ? "text-neon-pink font-bold bg-neon-pink/5" : "text-gray-400"
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {row.isWinner === "B" && <Check className="w-4 h-4 text-neon-pink" />}
                        {row.valB}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center font-mono text-xs">
                      {row.diff > 0 ? (
                        <span className={`px-2 py-0.5 rounded font-semibold ${
                          row.isWinner === "A" ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20" : "bg-neon-pink/15 text-neon-pink border border-neon-pink/20"
                        }`}>
                          {row.isWinner === "A" ? `+${row.diff.toFixed(1)} (A wins)` : `+${row.diff.toFixed(1)} (B wins)`}
                        </span>
                      ) : (
                        <span className="text-gray-600">Equal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Trade-offs Card */}
          {results.tradeoffs && results.tradeoffs.length > 0 && candidateA === results.ranked_alternatives[0]?.id && candidateB === results.ranked_alternatives[1]?.id && (
            <div className="glass-panel-neon-purple p-6 rounded-2xl border border-neon-purple/20 flex flex-col gap-3">
              <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4.5 h-4.5 text-neon-purple" /> Algorithm Trade-off Details
              </h3>
              <p className="text-xs text-gray-400">
                Pairwise trade-offs calculated automatically by the MAUT utility engine comparing the top two options.
              </p>
              <div className="flex flex-col gap-2 mt-2">
                {results.tradeoffs.map((item, idx) => (
                  <div key={idx} className="bg-black/20 border border-white/5 p-3 rounded-lg text-xs text-gray-300 leading-relaxed font-mono">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500 font-medium">
          Please select both candidates to display comparison matrix.
        </div>
      )}
    </div>
  );
}
