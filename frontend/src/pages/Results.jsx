import React, { useState, useEffect } from "react";
import { Award, ShieldAlert, Cpu, Download, Sparkles, Terminal, FileText, ChevronRight, Sliders, ArrowLeft, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SearchVisualization from "../components/SearchVisualization";

export default function Results({ onNavigate }) {
  const [results, setResults] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mcdss_active_results");
    if (saved) {
      try {
        setResults(JSON.parse(saved));
      } catch (err) {
        console.error("Error parsing results:", err);
      }
    }
  }, []);

  if (!results) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Cpu className="w-16 h-16 text-gray-700 animate-spin mb-4" />
        <h3 className="font-orbitron font-extrabold text-lg text-white uppercase tracking-wider">
          Waiting for Decision
        </h3>
        <p className="text-gray-500 text-xs mt-1">Please create a decision vector and run the solver.</p>
        <button
          onClick={() => onNavigate("create")}
          className="mt-6 px-6 py-2.5 bg-neon-cyan text-black font-semibold rounded-lg text-xs uppercase tracking-wider font-orbitron hover:bg-white transition"
        >
          Create Decision
        </button>
      </div>
    );
  }

  const {
    decision_name,
    ranked_alternatives = [],
    failed_alternatives = [],
    confidence = {},
    explanations = {},
    logs = [],
    criteria = {},
    weights = {},
    constraints = []
  } = results;

  const winner = ranked_alternatives[0];

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("http://localhost:8000/api/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ report_data: results }),
      });
      if (!response.ok) {
        throw new Error("Failed to export PDF report");
      }
      const data = await response.json();
      
      // Convert base64 to blob and trigger download
      const byteCharacters = atob(data.pdf_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = data.filename || "mcdss_report.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Could not generate PDF. Ensure the backend uvicorn is running.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-8 max-w-6xl mx-auto w-full px-4 py-8">
      {/* Navigation and Top Bar */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <button
          onClick={() => onNavigate("create")}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white uppercase tracking-wider font-orbitron transition"
        >
          <ArrowLeft className="w-4 h-4" /> Edit Parameters
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate("analytics")}
            className="px-4 py-2 bg-cyber-dark text-neon-blue border border-neon-blue/20 hover:border-neon-blue hover:bg-neon-blue/10 rounded-xl text-xs font-semibold uppercase tracking-wider font-orbitron transition flex items-center gap-1.5"
          >
            <BarChart2 className="w-4 h-4" /> Visual Analytics
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-4 py-2 bg-neon-cyan hover:bg-white text-black rounded-xl text-xs font-bold uppercase tracking-wider font-orbitron transition flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,240,255,0.25)]"
          >
            {isExporting ? (
              <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export PDF Report
          </button>
        </div>
      </div>

      {/* Decision Champion Header */}
      {winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel-neon-cyan p-6 rounded-2xl border border-neon-cyan/25 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden"
        >
          {/* Cybernetic accent element */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start gap-4">
            <div className="p-4 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 rounded-2xl flex-shrink-0 animate-pulse">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] text-neon-cyan font-semibold uppercase tracking-widest font-orbitron block mb-1">
                A* Search Winning Champion
              </span>
              <h2 className="font-orbitron font-extrabold text-2xl text-white uppercase tracking-wider">
                {winner.name}
              </h2>
              <p className="text-xs text-gray-400 mt-1 max-w-xl">
                Evaluated as optimal across all criteria weights. Matches {confidence.confidence_desc || "high certainty"} constraints satisfaction profile.
              </p>
            </div>
          </div>

          <div className="flex gap-6 self-stretch sm:self-auto border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 pl-0 sm:pl-6 text-left sm:text-right flex-shrink-0 font-mono">
            <div>
              <span className="text-[9px] text-gray-500 uppercase block">Utility Score</span>
              <span className="text-2xl font-bold text-neon-cyan">
                {((winner.utility_score || winner.search_rank_utility || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[9px] text-gray-500 uppercase block">Certainty %</span>
              <span className="text-2xl font-bold text-neon-purple">
                {confidence.certainty_percentage || 85}%
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Results Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ranked Alternatives + Failed */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Ranked Candidates */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
            <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
              <Cpu className="w-4.5 h-4.5 text-neon-cyan" /> Calculated Rankings
            </h3>
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {ranked_alternatives.map((alt, index) => (
                  <motion.div
                    key={alt.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className={`p-4 rounded-xl border flex justify-between items-center transition ${
                      index === 0
                        ? "bg-neon-cyan/5 border-neon-cyan/35 text-white"
                        : "bg-black/20 border-white/5 hover:border-white/10 text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-cyber-dark border border-white/10 flex items-center justify-center font-mono font-bold text-xs">
                        #{index + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-sm text-white">{alt.name}</span>
                        <div className="flex gap-3 text-[10px] text-gray-500 font-mono mt-0.5">
                          {Object.entries(alt.values).map(([k, v]) => (
                            <span key={k}>
                              {criteria[k]?.name || k}: <strong className="text-gray-300">{v}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className={`text-sm font-bold ${index === 0 ? "text-neon-cyan" : "text-gray-300"}`}>
                        {((alt.utility_score || alt.search_rank_utility || 0) * 100).toFixed(2)}%
                      </span>
                      <p className="text-[9px] text-gray-600 uppercase">Utility score</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Failed Candidates (CSP Pruned) */}
          {failed_alternatives.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
              <h3 className="font-orbitron font-bold text-sm text-neon-pink uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
                <ShieldAlert className="w-4.5 h-4.5 text-neon-pink" /> Eliminated Candidates (CSP Failed)
              </h3>
              <div className="flex flex-col gap-3">
                {failed_alternatives.map((alt) => (
                  <div key={alt.id} className="p-4 bg-neon-pink/5 border border-neon-pink/15 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-bold text-sm text-neon-pink block">{alt.name}</span>
                      <p className="text-xs text-gray-300 mt-1 font-medium">
                        {alt.csp_prune_reason || "Violated constraint thresholds."}
                      </p>
                    </div>
                    {alt.utility_score !== undefined && (
                      <div className="text-right font-mono flex-shrink-0 ml-4">
                        <span className="text-xs font-semibold text-gray-500 line-through">
                          {(alt.utility_score * 100).toFixed(1)}%
                        </span>
                        <p className="text-[8px] text-gray-600 uppercase">raw utility</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Explainable AI Commentary */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-panel-neon-purple p-6 rounded-2xl border border-neon-purple/20 flex-1 flex flex-col gap-4">
            <h3 className="font-orbitron font-extrabold text-xs text-neon-purple tracking-widest uppercase flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Sparkles className="w-4 h-4" /> Explainable Recommendation
            </h3>
            
            <div className="flex flex-col gap-4 text-xs text-gray-300 leading-relaxed overflow-y-auto max-h-[360px]">
              <div>
                <h4 className="font-semibold text-white mb-1">Winning Justification</h4>
                <p className="text-gray-400 bg-black/25 p-3 rounded-lg border border-white/5 italic">
                  "{explanations.winning_justification || "Determining winning candidate evaluation parameters..."}"
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1">Attribute Trade-off Analysis</h4>
                <p className="text-gray-400 bg-black/25 p-3 rounded-lg border border-white/5">
                  {explanations.tradeoff_analysis || "Comparing criteria separation vectors..."}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1">Ranking Rationale</h4>
                <p className="text-gray-400 bg-black/25 p-3 rounded-lg border border-white/5">
                  {explanations.ranking_rationale || "Calculated via A* state space evaluation."}
                </p>
              </div>
            </div>
            
            {ranked_alternatives.length >= 2 && (
              <button
                onClick={() => onNavigate("comparison")}
                className="w-full mt-auto py-2 bg-cyber-dark text-neon-purple hover:bg-neon-purple/10 border border-neon-purple/25 hover:border-neon-purple rounded-xl text-xs font-semibold uppercase tracking-wider font-orbitron transition flex items-center justify-center gap-1"
              >
                Compare Top 2 Alternatives <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* A* Graph Search State Space Visualization */}
      <SearchVisualization traceNodes={results.trace_nodes} criteria={criteria} />

      {/* Trace Logs Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
        <button
          onClick={() => setLogExpanded(!logExpanded)}
          className="flex justify-between items-center w-full font-orbitron font-extrabold text-xs text-gray-400 uppercase tracking-widest hover:text-white transition"
        >
          <span className="flex items-center gap-1.5"><Terminal className="w-4 h-4 text-neon-blue" /> Decision Execution Logs</span>
          <span>{logExpanded ? "Collapse" : "Expand Trace"}</span>
        </button>
        
        {logExpanded && (
          <div className="bg-black/80 border border-white/5 p-4 rounded-xl font-mono text-[11px] text-green-400 flex flex-col gap-1 max-h-[300px] overflow-y-auto leading-relaxed shadow-inner">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-gray-600 flex-shrink-0">[{idx.toString().padStart(2, '0')}]</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
