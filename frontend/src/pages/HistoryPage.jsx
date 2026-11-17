import React, { useState, useEffect } from "react";
import { History, Trash2, ArrowRight, BookOpen, Sliders, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HistoryPage({ onNavigate, setDecisionState }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const saved = localStorage.getItem("mcdss_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (err) {
        console.error("Error parsing history in HistoryPage:", err);
      }
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all decision history?")) {
      localStorage.removeItem("mcdss_history");
      setHistory([]);
    }
  };

  const handleDeleteItem = (e, index) => {
    e.stopPropagation(); // prevent card load click
    const updated = history.filter((_, idx) => idx !== index);
    localStorage.setItem("mcdss_history", JSON.stringify(updated));
    setHistory(updated);
  };

  const handleLoadItem = (item) => {
    setDecisionState(item.input_state);
    if (item.result_state) {
      localStorage.setItem("mcdss_active_results", JSON.stringify(item.result_state));
      onNavigate("results");
    } else {
      onNavigate("create");
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          <h2 className="font-orbitron font-extrabold text-2xl text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-6 h-6 text-neon-pink" /> Decision Archives
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Browse and load previously analyzed decision vectors and utility ranking charts.
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="px-4 py-2 bg-neon-pink/15 text-neon-pink border border-neon-pink/20 hover:bg-neon-pink hover:text-white rounded-xl text-xs font-semibold uppercase tracking-wider font-orbitron transition flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
        )}
      </div>

      {/* History Grid */}
      {history.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center min-h-[300px]">
          <BookOpen className="w-12 h-12 text-gray-600 mb-4 animate-pulse" />
          <h3 className="font-orbitron font-bold text-sm text-gray-400 uppercase tracking-widest">
            History is Empty
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
            Run some decision pipeline runs in the Decision Creator. They will be archived here automatically.
          </p>
          <button
            onClick={() => onNavigate("create")}
            className="mt-6 px-6 py-2 bg-neon-cyan text-black font-semibold rounded-lg text-xs uppercase tracking-wider font-orbitron hover:bg-white transition"
          >
            Create Decision
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {history.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleLoadItem(item)}
                className="glass-panel-neon-pink p-5 rounded-2xl border cursor-pointer hover:scale-[1.01] hover:-translate-y-0.5 transition duration-300 flex flex-col gap-4 relative group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-orbitron font-bold text-base text-white group-hover:text-neon-pink transition">
                      {item.decision_name}
                    </h3>
                    <span className="text-[10px] text-gray-500 font-mono uppercase mt-0.5 block">
                      Category: {item.category} | {item.timestamp}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteItem(e, idx)}
                    className="p-1.5 bg-black/40 text-gray-500 hover:text-neon-pink rounded border border-white/5 hover:border-neon-pink/30 transition opacity-0 group-hover:opacity-100"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2 font-mono text-xs border-t border-white/5 pt-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Database className="w-4 h-4 text-neon-cyan" />
                    <span>{item.input_state?.alternatives?.length || 0} Candidates</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Sliders className="w-4 h-4 text-neon-purple" />
                    <span>{Object.keys(item.input_state?.criteria || {}).length} Criteria</span>
                  </div>
                </div>

                {item.result_state?.ranked_alternatives?.[0] && (
                  <div className="bg-black/35 rounded-xl p-3 border border-white/5 flex justify-between items-center mt-1">
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase block font-mono">Top Pick Winner</span>
                      <span className="text-sm font-bold text-white">
                        {item.result_state.ranked_alternatives[0].name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-neon-pink">
                        {((item.result_state.ranked_alternatives[0].utility_score || 0) * 100).toFixed(1)}%
                      </span>
                      <span className="block text-[8px] text-gray-500 font-mono uppercase">Utility</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-2 text-xs font-semibold text-neon-pink items-center gap-1.5 uppercase font-orbitron tracking-wider">
                  Reload comparison <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
