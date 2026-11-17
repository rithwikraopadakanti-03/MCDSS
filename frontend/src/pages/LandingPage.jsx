import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Laptop, GraduationCap, Compass, HelpCircle, History, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage({ onNavigate, setDecisionState }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("mcdss_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (err) {
        console.error("Error reading history in LandingPage:", err);
      }
    }
  }, []);

  const templates = [
    {
      title: "Laptop Selection",
      desc: "Compare performance, battery life, budget constraints, and build quality.",
      icon: Laptop,
      color: "from-blue-500 to-indigo-600",
      theme: "glass-panel-neon-blue",
      category: "laptop",
    },
    {
      title: "College Recommendation",
      desc: "Evaluate universities based on rankings, average placements, fees, and location.",
      icon: GraduationCap,
      color: "from-purple-500 to-pink-600",
      theme: "glass-panel-neon-purple",
      category: "college",
    },
    {
      title: "Travel Planning",
      desc: "Analyze vacation destinations using travel costs, safety, and travel time.",
      icon: Compass,
      color: "from-pink-500 to-rose-600",
      theme: "glass-panel-neon-pink",
      category: "travel",
    },
    {
      title: "Custom Decision",
      desc: "Define your own options, criteria, custom weights, and arbitrary constraints.",
      icon: HelpCircle,
      color: "from-cyan-500 to-teal-600",
      theme: "glass-panel-neon-cyan",
      category: "custom",
    },
  ];

  const handleStartTemplate = async (template) => {
    // If it's a known template, suggest criteria from local/backend first
    if (template.category === "custom") {
      setDecisionState({
        decision_name: "My Custom Decision",
        category: "custom",
        alternatives: [],
        criteria: {},
        weights: {},
        constraints: [],
      });
      onNavigate("create");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/suggest-criteria`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category: template.category }),
      });
      if (response.ok) {
        const data = await response.json();
        // Set standard alternatives based on templates
        let alts = [];
        if (template.category === "laptop") {
          alts = [
            { id: "1", name: "Dell XPS 15", values: { price: 120000, performance: 9, battery: 12, weight: 1.8 } },
            { id: "2", name: "MacBook Air M3", values: { price: 110000, performance: 8, battery: 18, weight: 1.2 } },
            { id: "3", name: "Lenovo ThinkPad X1", values: { price: 145000, performance: 8.5, battery: 14, weight: 1.4 } },
            { id: "4", name: "ASUS TUF Gaming", values: { price: 75000, performance: 9.5, battery: 4.5, weight: 2.3 } },
          ];
        } else if (template.category === "college") {
          alts = [
            { id: "1", name: "IIT Bombay", values: { fees: 220000, placement: 24, ranking: 3, campus_life: 4.5 } },
            { id: "2", name: "BITS Pilani", values: { fees: 450000, placement: 18, ranking: 7, campus_life: 4.8 } },
            { id: "3", name: "VIT Vellore", values: { fees: 260000, placement: 9.5, ranking: 15, campus_life: 4.2 } },
            { id: "4", name: "Delhi University", values: { fees: 15000, placement: 8, ranking: 11, campus_life: 4.0 } },
          ];
        } else if (template.category === "travel") {
          alts = [
            { id: "1", name: "Goa", values: { cost: 25000, safety: 4.2, activities: 9, travel_time: 4 } },
            { id: "2", name: "Ladakh", values: { cost: 45000, safety: 4.6, activities: 8, travel_time: 14 } },
            { id: "3", name: "Kerala", values: { cost: 32000, safety: 4.8, activities: 7.5, travel_time: 6 } },
            { id: "4", name: "Manali", values: { cost: 18000, safety: 4.0, activities: 8.5, travel_time: 12 } },
          ];
        }

        // Setup default weights from criteria
        const weights = {};
        Object.entries(data.criteria).forEach(([k, c]) => {
          weights[k] = c.weight || 0.25;
        });

        setDecisionState({
          decision_name: `Choose Best ${template.title.split(" ")[0]}`,
          category: template.category,
          alternatives: alts,
          criteria: data.criteria,
          weights: weights,
          constraints: [],
        });
        onNavigate("create");
      }
    } catch (err) {
      console.error("Failed to load template:", err);
      // Fallback
      setDecisionState({
        decision_name: `Choose Best ${template.title}`,
        category: template.category,
        alternatives: [],
        criteria: {},
        weights: {},
        constraints: [],
      });
      onNavigate("create");
    }
  };

  const handleLoadHistory = (item) => {
    setDecisionState(item.input_state);
    if (item.result_state) {
      // If we have cached results, pass them along in some state or let results page know
      localStorage.setItem("mcdss_active_results", JSON.stringify(item.result_state));
    }
    onNavigate("create");
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative max-w-6xl mx-auto w-full">
      {/* Background Neon Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-neon-purple/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-neon-cyan/15 blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center flex flex-col items-center max-w-3xl mb-16"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-neon-cyan text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
          <BrainCircuit className="w-4 h-4" /> Cybernetic Multi-Criteria Framework
        </div>
        <h1 className="font-orbitron font-extrabold text-4xl sm:text-6xl text-white uppercase tracking-wider leading-tight mb-6">
          Multi-Criteria <br className="hidden sm:inline" />
          <span className="cyber-gradient-text">Decision System</span>
        </h1>
        <p className="text-gray-400 text-base sm:text-lg font-medium max-w-2xl">
          An advanced AI-powered utility-based decision support system leveraging Constraint Satisfaction (CSP), A* search frontier calculations, and multi-attribute utility theory.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleStartTemplate({ category: "custom", title: "Custom Decision" })}
            className="px-8 py-3.5 bg-neon-purple text-white font-bold font-orbitron uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(157,78,221,0.4)] hover:bg-white hover:text-black hover:shadow-white/20 transition duration-300 flex items-center gap-2 group"
          >
            Create New Decision <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </button>
          <button
            onClick={() => onNavigate("chatbot")}
            className="px-8 py-3.5 bg-cyber-dark text-neon-cyan font-bold font-orbitron uppercase tracking-wider rounded-xl border border-neon-cyan/30 hover:border-neon-cyan hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition duration-300"
          >
            Converse with AI
          </button>
        </div>
      </motion.div>

      {/* Templates section */}
      <div className="w-full mb-16">
        <h2 className="font-orbitron font-extrabold text-xl text-white uppercase tracking-widest text-center mb-8 flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-neon-cyan" /> Select Category Template
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((template, idx) => {
            const Icon = template.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => handleStartTemplate(template)}
                className={`${template.theme} p-6 rounded-2xl border cursor-pointer group hover:scale-[1.03] hover:-translate-y-1 transition duration-300`}
              >
                <div className={`p-3 rounded-xl bg-gradient-to-br ${template.color} text-white w-max mb-5 group-hover:scale-110 transition duration-300 shadow-md`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-orbitron font-bold text-base text-white mb-2 uppercase group-hover:text-neon-cyan transition">
                  {template.title}
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {template.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* History check */}
      {history.length > 0 && (
        <div className="w-full max-w-4xl border-t border-white/5 pt-12">
          <h2 className="font-orbitron font-extrabold text-lg text-white uppercase tracking-widest text-center mb-6 flex items-center justify-center gap-2">
            <History className="w-5 h-5 text-neon-pink" /> Recent Saved Comparisons
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {history.slice(0, 4).map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleLoadHistory(item)}
                className="glass-panel p-4 rounded-xl border border-white/5 hover:border-neon-pink/40 hover:bg-neon-pink/5 cursor-pointer flex justify-between items-center transition"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">{item.decision_name}</span>
                  <span className="text-[10px] text-gray-500 font-mono uppercase mt-0.5">
                    {item.category} | {item.timestamp}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-neon-pink" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
