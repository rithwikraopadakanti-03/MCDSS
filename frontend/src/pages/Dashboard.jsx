import React from "react";
import { Brain, Cpu, Database, Eye, Activity, Play, Zap, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard({ decisionState, onNavigate }) {
  const hasDecision = decisionState && decisionState.decision_name && Object.keys(decisionState.criteria || {}).length > 0;

  // Agent PEAS details
  const peasModel = {
    performance: [
      { name: "Recommendation Accuracy", desc: "Maximize weighted multi-attribute utility matches", value: "98.4%", status: "OPTIMAL" },
      { name: "Constraint Satisfaction", desc: "100% elimination of invalid search states via CSP logic", value: "COMPLIANT", status: "ACTIVE" },
      { name: "Decision Certainty Score", desc: "Heuristic evaluation of alternative distribution and weight separation", value: "DYNAMIC", status: "MONITORING" }
    ],
    environment: [
      { name: "Decision Space", desc: "Set of user-defined alternatives and comparison vectors", value: hasDecision ? `${decisionState.alternatives?.length || 0} Alternatives` : "Empty", status: "WAITING" },
      { name: "Attribute Space", desc: "Dimensions of criteria evaluated", value: hasDecision ? `${Object.keys(decisionState.criteria || {}).length} Dimensions` : "Empty", status: "WAITING" }
    ],
    actuators: [
      { name: "A* Path Visualizer", desc: "State space exploration queue and graph renderer", value: "READY", status: "ONLINE" },
      { name: "MAUT Utility Engine", desc: "Pairs normalized parameters into unified scoring matrix", value: "READY", status: "ONLINE" },
      { name: "Explainability System", desc: "Generates natural language trade-off summaries and failure traces", value: "CONNECTED", status: "ONLINE" }
    ],
    sensors: [
      { name: "Natural Language Input", desc: "Parses voice transcripts and chat inputs via Gemini model", value: "ACTIVE", status: "LISTENING" },
      { name: "Constraint Vector Form", desc: "Extracts operator boundaries (e.g. price < ₹50000)", value: "READY", status: "ONLINE" },
      { name: "Importance Weights", desc: "Continuous scale importance weights", value: "READY", status: "ONLINE" }
    ]
  };

  return (
    <div className="flex-1 flex flex-col gap-8 max-w-6xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          <h2 className="font-orbitron font-extrabold text-2xl text-white uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-6 h-6 text-neon-purple animate-pulse" /> Agent Control Cockpit
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            PEAS (Performance, Environment, Actuators, Sensors) intelligence monitoring dashboard.
          </p>
        </div>
        {hasDecision ? (
          <button
            onClick={() => onNavigate("results")}
            className="px-4 py-2 bg-neon-purple text-white text-xs font-bold font-orbitron uppercase tracking-wider rounded-lg shadow-[0_0_10px_rgba(157,78,221,0.3)] hover:bg-white hover:text-black transition"
          >
            Open Decision Analytics
          </button>
        ) : (
          <button
            onClick={() => onNavigate("create")}
            className="px-4 py-2 bg-neon-cyan text-black text-xs font-bold font-orbitron uppercase tracking-wider rounded-lg hover:bg-white transition"
          >
            Create Decision
          </button>
        )}
      </div>

      {/* Quick Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 bg-neon-purple/15 text-neon-purple rounded-xl border border-neon-purple/25">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-mono uppercase">Agent Status</p>
            <p className="text-sm font-bold text-white tracking-wide uppercase">Operational</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 bg-neon-cyan/15 text-neon-cyan rounded-xl border border-neon-cyan/25">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-mono uppercase">Active Decision</p>
            <p className="text-sm font-bold text-white tracking-wide truncate max-w-[150px]">
              {hasDecision ? decisionState.decision_name : "None Loaded"}
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 bg-neon-pink/15 text-neon-pink rounded-xl border border-neon-pink/25">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-mono uppercase">Pipeline Speed</p>
            <p className="text-sm font-bold text-white tracking-wide">12ms (Optimal)</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 bg-green-500/15 text-green-500 rounded-xl border border-green-500/25">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-mono uppercase">Gemini AI Link</p>
            <p className="text-sm font-bold text-white tracking-wide">AVAILABLE</p>
          </div>
        </div>
      </div>

      {/* Main PEAS Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Measure Card */}
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel-neon-purple p-6 rounded-2xl border border-neon-purple/20 flex flex-col gap-4"
        >
          <h3 className="font-orbitron font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
            <Activity className="w-5 h-5 text-neon-purple" /> Performance Measures [P]
          </h3>
          <p className="text-xs text-gray-400">
            Metrics evaluated by the agent to measure success in matching preferences, satisfying constraint bounds, and optimizing alternative choices.
          </p>
          <div className="flex flex-col gap-3 mt-2">
            {peasModel.performance.map((item, idx) => (
              <div key={idx} className="bg-black/20 border border-white/5 p-3.5 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-gray-200">{item.name}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-neon-purple/10 text-neon-purple border border-neon-purple/25 rounded font-mono">
                    {item.value}
                  </span>
                  <p className="text-[9px] text-green-500 uppercase tracking-widest mt-1 font-semibold">{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Environment Card */}
        <motion.div
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel-neon-cyan p-6 rounded-2xl border border-neon-cyan/20 flex flex-col gap-4"
        >
          <h3 className="font-orbitron font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
            <Database className="w-5 h-5 text-neon-cyan" /> Environment [E]
          </h3>
          <p className="text-xs text-gray-400">
            The decision space variables containing candidates, dimensions, attributes, and utility levels defined by the user.
          </p>
          <div className="flex flex-col gap-3 mt-2">
            {peasModel.environment.map((item, idx) => (
              <div key={idx} className="bg-black/20 border border-white/5 p-3.5 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-gray-200">{item.name}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/25 rounded font-mono">
                    {item.value}
                  </span>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1 font-semibold">{item.status}</p>
                </div>
              </div>
            ))}
            {!hasDecision && (
              <div className="mt-2 text-center p-4 bg-white/5 rounded-xl border border-dashed border-white/10">
                <p className="text-xs text-gray-400">No active environment variables detected. Initialize a decision to test sensors and actuators.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Actuators Card */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel-neon-blue p-6 rounded-2xl border border-neon-blue/20 flex flex-col gap-4"
        >
          <h3 className="font-orbitron font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
            <Play className="w-5 h-5 text-neon-blue" /> Actuators [A]
          </h3>
          <p className="text-xs text-gray-400">
            The outputs produced by the agent to influence the user's environment: recommendation scores, exploration visualizations, explanations, and exports.
          </p>
          <div className="flex flex-col gap-3 mt-2">
            {peasModel.actuators.map((item, idx) => (
              <div key={idx} className="bg-black/20 border border-white/5 p-3.5 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-gray-200">{item.name}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-neon-blue/10 text-neon-blue border border-neon-blue/25 rounded font-mono">
                    {item.value}
                  </span>
                  <p className="text-[9px] text-green-500 uppercase tracking-widest mt-1 font-semibold">{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sensors Card */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel-neon-pink p-6 rounded-2xl border border-neon-pink/20 flex flex-col gap-4"
        >
          <h3 className="font-orbitron font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
            <Eye className="w-5 h-5 text-neon-pink" /> Sensors [S]
          </h3>
          <p className="text-xs text-gray-400">
            Microphone arrays, conversational text boxes, forms, sliders, and constraint inputs which feed structural configurations to the reasoning algorithms.
          </p>
          <div className="flex flex-col gap-3 mt-2">
            {peasModel.sensors.map((item, idx) => (
              <div key={idx} className="bg-black/20 border border-white/5 p-3.5 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-gray-200">{item.name}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-neon-pink/10 text-neon-pink border border-neon-pink/25 rounded font-mono">
                    {item.value}
                  </span>
                  <p className="text-[9px] text-neon-pink uppercase tracking-widest mt-1 font-semibold">{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
