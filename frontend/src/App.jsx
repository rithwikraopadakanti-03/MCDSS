import React, { useState, useEffect } from "react";
import { Brain, LayoutDashboard, Sliders, History, MessageSquare, Scale, BarChart2, ShieldAlert, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Pages
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import DecisionCreation from "./pages/DecisionCreation";
import Results from "./pages/Results";
import Comparison from "./pages/Comparison";
import ChatbotPage from "./pages/ChatbotPage";
import HistoryPage from "./pages/HistoryPage";
import Analytics from "./pages/Analytics";

export default function App() {
  const [activePage, setActivePage] = useState("landing");
  const [decisionState, setDecisionState] = useState({
    decision_name: "",
    category: "",
    alternatives: [],
    criteria: {},
    weights: {},
    constraints: [],
  });

  const BACKEND_URL = "http://localhost:8000";

  // Check health of backend on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => console.log("MCDSS Backend Status:", data))
      .catch((err) => console.error("FastAPI Backend unreachable. Check local server."));
  }, []);

  const hasDecisionActive = decisionState.decision_name && Object.keys(decisionState.criteria || {}).length > 0;

  const navigateTo = (page) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navItems = [
    { id: "landing", label: "Gateway", icon: Brain },
    { id: "dashboard", label: "Cockpit", icon: LayoutDashboard },
    { id: "create", label: "Creator", icon: Sliders },
    { id: "results", label: "Analytics", icon: BarChart2, disabled: !hasDecisionActive },
    { id: "comparison", label: "Matrix", icon: Scale, disabled: !hasDecisionActive },
    { id: "chatbot", label: "AI Oracle", icon: MessageSquare },
    { id: "history", label: "Archives", icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col relative text-gray-200">
      {/* Dynamic Cyber Grid & Animated background */}
      <div className="animated-bg" />
      <div className="fixed inset-0 cyber-grid opacity-30 pointer-events-none" />

      {/* Global Header */}
      <header className="sticky top-0 z-40 bg-cyber-dark/70 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div
          onClick={() => navigateTo("landing")}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="p-2 bg-neon-purple/10 text-neon-purple border border-neon-purple/20 rounded-xl group-hover:scale-110 group-hover:shadow-[0_0_10px_rgba(157,78,221,0.4)] transition duration-300">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-orbitron font-extrabold text-sm sm:text-base text-white tracking-widest uppercase m-0 leading-none">
              MCDSS <span className="text-neon-cyan">AGENT</span>
            </h1>
            <span className="text-[9px] text-gray-500 font-mono tracking-wider">v1.0.0 (FastAPI-React)</span>
          </div>
        </div>

        {/* Action tags */}
        {hasDecisionActive && (
          <div className="hidden md:flex items-center gap-2 bg-neon-cyan/5 border border-neon-cyan/25 rounded-xl px-3 py-1 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
            <span className="text-gray-400 font-mono font-medium">Active Vector:</span>
            <span className="text-white font-semibold truncate max-w-[150px]">{decisionState.decision_name}</span>
          </div>
        )}
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-60 bg-cyber-dark/30 border-r border-white/5 px-4 py-6 flex flex-col gap-2">
          <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest px-3 mb-2 block">
            Navigation Interface
          </span>
          <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-1.5 pb-3 md:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  disabled={item.disabled}
                  onClick={() => navigateTo(item.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider font-orbitron transition duration-300 w-full whitespace-nowrap ${
                    activePage === item.id
                      ? "bg-neon-purple/15 text-white border border-neon-purple/35 shadow-[0_0_15px_rgba(157,78,221,0.15)]"
                      : item.disabled
                      ? "opacity-25 cursor-not-allowed text-gray-600"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Core Workspace Panel */}
        <main className="flex-1 flex flex-col min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              {activePage === "landing" && (
                <LandingPage
                  onNavigate={navigateTo}
                  setDecisionState={setDecisionState}
                />
              )}
              {activePage === "dashboard" && (
                <Dashboard
                  decisionState={decisionState}
                  onNavigate={navigateTo}
                />
              )}
              {activePage === "create" && (
                <DecisionCreation
                  decisionState={decisionState}
                  setDecisionState={setDecisionState}
                  onNavigate={navigateTo}
                />
              )}
              {activePage === "results" && (
                <Results
                  onNavigate={navigateTo}
                />
              )}
              {activePage === "comparison" && (
                <Comparison
                  onNavigate={navigateTo}
                />
              )}
              {activePage === "chatbot" && (
                <ChatbotPage
                  decisionState={decisionState}
                  setDecisionState={setDecisionState}
                />
              )}
              {activePage === "history" && (
                <HistoryPage
                  onNavigate={navigateTo}
                  setDecisionState={setDecisionState}
                />
              )}
              {activePage === "analytics" && (
                <Analytics
                  onNavigate={navigateTo}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Footer */}
      <footer className="bg-cyber-dark/40 border-t border-white/5 py-4 text-center text-[10px] text-gray-600 font-mono">
        MCDSS Decision Agent System • Multi-Attribute Utility Optimization Engine • AI Lab 2026
      </footer>
    </div>
  );
}
