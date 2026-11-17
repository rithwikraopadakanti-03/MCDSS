import React from "react";
import { MessageSquare, Bot, Key, Sparkles } from "lucide-react";
import AIChatbot from "../components/AIChatbot";

export default function ChatbotPage({ decisionState, setDecisionState }) {
  const handleStateUpdate = (extractedData) => {
    // Perform partial updates of extracted values
    setDecisionState((prev) => {
      const updated = { ...prev };
      if (extractedData.decision_name) updated.decision_name = extractedData.decision_name;
      if (extractedData.alternatives) {
        // Map string array to object structure
        updated.alternatives = extractedData.alternatives.map((name, i) => {
          const vals = {};
          Object.keys(extractedData.criteria || prev.criteria || {}).forEach(k => {
            vals[k] = 0;
          });
          return { id: `alt_${Date.now()}_${i}`, name, values: vals };
        });
      }
      if (extractedData.criteria) updated.criteria = extractedData.criteria;
      if (extractedData.weights) updated.weights = extractedData.weights;
      if (extractedData.constraints) updated.constraints = extractedData.constraints;
      return updated;
    });
  };

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <h2 className="font-orbitron font-extrabold text-2xl text-white uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-neon-cyan" /> Conversational Agent Interface
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Instruct the AI in natural language to setup decision criteria, constraints, and candidates dynamically.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Chatbot Interface */}
        <div className="lg:col-span-8">
          <AIChatbot currentState={decisionState} onStateUpdate={handleStateUpdate} />
        </div>

        {/* Side Panel: Explanation and API key info */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
            <h3 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-neon-cyan" /> Capabilities
            </h3>
            <div className="flex flex-col gap-3 text-xs text-gray-400">
              <p>
                The conversational sensor utilizes the Gemini model to parse natural sentences into parameters.
              </p>
              <div className="flex flex-col gap-2 font-mono text-[11px]">
                <div className="bg-black/20 p-2.5 rounded border border-white/5">
                  <strong className="text-neon-cyan block mb-1">Templates:</strong>
                  "Help me choose a laptop"
                </div>
                <div className="bg-black/20 p-2.5 rounded border border-white/5">
                  <strong className="text-neon-cyan block mb-1">Constraints:</strong>
                  "Budget under 70000"
                </div>
                <div className="bg-black/20 p-2.5 rounded border border-white/5">
                  <strong className="text-neon-cyan block mb-1">Candidates:</strong>
                  "Include Dell, HP and Lenovo"
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
            <h3 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4 text-neon-purple" /> Gemini API Config
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Ensure you have set `GEMINI_API_KEY` in the backend `.env` file for best parsing performance. If no key is set, the system automatically falls back to regex-based local parsing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
