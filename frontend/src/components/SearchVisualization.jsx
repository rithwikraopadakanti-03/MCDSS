import React, { useState, useEffect } from "react";
import { Play, Pause, SkipForward, SkipBack, RefreshCw, Cpu, GitBranch, ShieldAlert, CheckCircle, ListOrdered } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SearchVisualization({ traceNodes = [], criteria = {} }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms

  const totalSteps = traceNodes.length;

  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, totalSteps, playbackSpeed]);

  if (!traceNodes || traceNodes.length === 0) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-white/5 text-center text-gray-400">
        <Cpu className="w-12 h-12 text-gray-600 mx-auto mb-3 animate-pulse" />
        <p className="font-orbitron font-semibold tracking-wider text-sm">A* SEARCH VISUALIZATION</p>
        <p className="text-xs text-gray-500 mt-1">No search trace available. Run a decision comparison to populate.</p>
      </div>
    );
  }

  // Compile state of open set, closed set, pruned nodes, and active paths up to currentStep
  const getSearchStateAtStep = (stepIndex) => {
    const openSet = [];
    const closedSet = [];
    const prunedList = [];
    const expandedHistory = [];

    for (let i = 0; i <= stepIndex; i++) {
      const entry = traceNodes[i];
      if (!entry) continue;

      if (entry.action === "POP") {
        expandedHistory.push({
          iteration: entry.iteration,
          name: entry.node.alternative_name,
          step: entry.node.step,
          f: entry.node.f,
          g: entry.node.g,
          h: entry.node.h,
          path: entry.node.path || [],
        });
        
        // Remove from open set if present
        const idx = openSet.findIndex(
          (n) => n.alternative_id === entry.node.alternative_id && n.step === entry.node.step
        );
        if (idx !== -1) openSet.splice(idx, 1);

        closedSet.push(`${entry.node.alternative_id}-${entry.node.step}`);
      } else if (entry.action === "PUSH") {
        openSet.push(entry.node);
      } else if (entry.action === "PRUNE") {
        prunedList.push({
          name: entry.alternative_name,
          reason: entry.reason,
          node: entry.node,
        });
      }
    }

    // Sort open set by F value (A* prioritization)
    openSet.sort((a, b) => {
      if (Math.abs(a.f - b.f) < 0.0001) {
        return b.step - a.step; // Prioritize deeper nodes
      }
      return a.f - b.f;
    });

    return { openSet, expandedHistory, prunedList };
  };

  const { openSet, expandedHistory, prunedList } = getSearchStateAtStep(currentStep);
  const currentAction = traceNodes[currentStep];

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };
  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1);
  };
  const handleStepBackward = () => {
    setIsPlaying(false);
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="glass-panel-neon-purple p-6 rounded-2xl border border-neon-purple/20 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-neon-purple animate-pulse" />
            <h3 className="font-orbitron font-extrabold text-lg text-white uppercase tracking-wider">
              A* Space Search Explorer
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Visualizing dynamic state evaluations. Lower <span className="text-neon-cyan">f(n) = g(n) + h(n)</span> indicates higher utility.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleReset}
            className="p-2 rounded-lg bg-cyber-dark text-gray-400 border border-gray-800 hover:text-white hover:border-gray-700 transition"
            title="Reset Search"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleStepBackward}
            disabled={currentStep === 0}
            className="p-2 rounded-lg bg-cyber-dark text-gray-400 border border-gray-800 hover:text-white hover:border-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 transition"
            title="Step Back"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={handlePlayPause}
            className={`p-2 px-4 rounded-lg flex items-center gap-1.5 font-semibold text-xs transition ${
              isPlaying
                ? "bg-neon-pink text-white border border-neon-pink"
                : "bg-neon-purple text-white border border-neon-purple"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Play
              </>
            )}
          </button>
          <button
            onClick={handleStepForward}
            disabled={currentStep === totalSteps - 1}
            className="p-2 rounded-lg bg-cyber-dark text-gray-400 border border-gray-800 hover:text-white hover:border-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 transition"
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-mono text-gray-400">
          <span>Search Step: {currentStep + 1} / {totalSteps}</span>
          <span>Playback Speed: {(playbackSpeed / 1000).toFixed(1)}s</span>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max={totalSteps - 1}
            value={currentStep}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStep(parseInt(e.target.value));
            }}
            className="flex-1 accent-neon-purple bg-cyber-dark h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
            className="bg-cyber-dark text-xs text-gray-300 font-mono border border-gray-800 rounded px-2 py-1 focus:outline-none focus:border-neon-purple"
          >
            <option value="1500">Slow</option>
            <option value="1000">Normal</option>
            <option value="500">Fast</option>
            <option value="200">Hyper</option>
          </select>
        </div>
      </div>

      {/* Main Grid Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Popped Node & Path Progress */}
        <div className="flex flex-col gap-4">
          <h4 className="font-orbitron font-bold text-xs text-neon-purple tracking-widest uppercase flex items-center gap-1.5 border-b border-white/5 pb-2">
            <GitBranch className="w-4 h-4" /> Active Search Frontier
          </h4>

          {/* Current Node Detail */}
          <div className="bg-cyber-dark/80 border border-white/5 rounded-xl p-4 flex flex-col gap-3 min-h-[140px]">
            <p className="text-xs text-gray-500 font-mono uppercase">Current Evaluated State</p>
            {currentAction ? (
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-base font-bold text-white tracking-wide">
                    {currentAction.action === "PRUNE" ? currentAction.alternative_name : currentAction.node.alternative_name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                      currentAction.action === "POP"
                        ? "bg-neon-blue/15 text-neon-blue border border-neon-blue/20"
                        : currentAction.action === "PRUNE"
                        ? "bg-neon-pink/15 text-neon-pink border border-neon-pink/20"
                        : "bg-neon-purple/15 text-neon-purple border border-neon-purple/20"
                    }`}
                  >
                    {currentAction.action}
                  </span>
                </div>
                {currentAction.action === "PRUNE" ? (
                  <p className="text-xs text-neon-pink mt-2 font-medium flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                    {currentAction.reason}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mt-3 font-mono text-xs border-t border-white/5 pt-2">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">f(n) Cost</p>
                      <p className="text-sm font-semibold text-white mt-0.5">{currentAction.node.f}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">g(n) Loss</p>
                      <p className="text-sm font-semibold text-gray-300 mt-0.5">{currentAction.node.g}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">h(n) Est</p>
                      <p className="text-sm font-semibold text-gray-300 mt-0.5">{currentAction.node.h}</p>
                    </div>
                  </div>
                )}
                {currentAction.node && (
                  <div className="mt-3">
                    <p className="text-[10px] text-gray-500 uppercase font-mono mb-1.5">Evaluation Depth ({currentAction.node.step} criteria)</p>
                    <div className="flex flex-wrap gap-1">
                      {currentAction.node.path?.map((cId, idx) => (
                        <span key={idx} className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-300">
                          {criteria[cId]?.name || cId}
                        </span>
                      ))}
                      {currentAction.node.step === 0 && <span className="text-[10px] text-gray-600 italic">Starting node</span>}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-600 italic">No node evaluated yet.</p>
            )}
          </div>

          {/* Expanded State Log */}
          <div className="bg-cyber-dark/40 border border-white/5 rounded-xl p-4 flex-1 flex flex-col gap-2 max-h-[220px] overflow-y-auto">
            <p className="text-xs text-gray-500 font-mono uppercase mb-1">Popped States Log</p>
            <div className="flex flex-col gap-1.5">
              {expandedHistory.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs bg-black/20 p-2 rounded border border-white/5">
                  <span className="font-semibold text-gray-300">{item.name} <span className="text-[10px] text-gray-500 font-normal">(step {item.step})</span></span>
                  <span className="font-mono text-neon-blue">f={item.f}</span>
                </div>
              ))}
              {expandedHistory.length === 0 && (
                <p className="text-xs text-gray-600 italic">No states popped yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Panel 2: Open Set (Priority Queue) */}
        <div className="flex flex-col gap-4">
          <h4 className="font-orbitron font-bold text-xs text-neon-cyan tracking-widest uppercase flex items-center gap-1.5 border-b border-white/5 pb-2">
            <ListOrdered className="w-4 h-4" /> Open Set (Priority Queue)
          </h4>
          <div className="bg-cyber-dark/60 border border-white/5 rounded-xl p-4 flex-1 flex flex-col gap-2 max-h-[380px] overflow-y-auto">
            <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase px-1 border-b border-white/5 pb-1 mb-1">
              <span>Alternative</span>
              <span>f = g + h</span>
            </div>
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {openSet.map((node, index) => (
                  <motion.div
                    key={`${node.alternative_id}-${node.step}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      index === 0
                        ? "bg-neon-cyan/10 border-neon-cyan/40 text-white font-medium shadow-[0_0_10px_rgba(0,240,255,0.15)]"
                        : "bg-black/20 border-white/5 text-gray-400"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white">{node.alternative_name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">Step {node.step} / {Object.keys(criteria).length}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono font-bold ${index === 0 ? "text-neon-cyan" : "text-gray-300"}`}>{node.f}</span>
                      <p className="text-[9px] text-gray-600 font-mono">g={node.g} h={node.h}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {openSet.length === 0 && (
                <p className="text-xs text-gray-600 italic text-center py-8">Priority Queue is empty.</p>
              )}
            </div>
          </div>
        </div>

        {/* Panel 3: Pruned Node & Violations */}
        <div className="flex flex-col gap-4">
          <h4 className="font-orbitron font-bold text-xs text-neon-pink tracking-widest uppercase flex items-center gap-1.5 border-b border-white/5 pb-2">
            <ShieldAlert className="w-4 h-4" /> Pruned / Violations
          </h4>
          <div className="bg-cyber-dark/60 border border-white/5 rounded-xl p-4 flex-1 flex flex-col gap-2 max-h-[380px] overflow-y-auto">
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {prunedList.map((prune, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-neon-pink/5 border border-neon-pink/20 rounded-xl"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-neon-pink">{prune.name}</span>
                      <span className="text-[9px] font-mono text-gray-500 bg-black/35 px-1.5 py-0.5 rounded">
                        Step {prune.node?.step + 1 || "CSP"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 font-medium">{prune.reason}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
              {prunedList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                  <CheckCircle className="w-8 h-8 mb-2 text-gray-700" />
                  <p className="text-xs italic">No options pruned so far</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
