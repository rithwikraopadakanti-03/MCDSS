import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Mic, Sparkles, Check, Info, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VoiceInputButton from "./VoiceInputButton";

export default function AIChatbot({
  currentState = {},
  onStateUpdate,
  backendUrl = "http://localhost:8000"
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am your MCDSS Intelligent Decision Agent. Tell me what decision you'd like to make (e.g., 'I want to choose a college' or 'Select a gaming laptop under ₹75,000'). I will extract criteria, weights, and constraints for you!",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const presets = [
    { label: "Laptop under ₹80k", prompt: "I want to choose a gaming laptop under 80000 with high performance and good battery life." },
    { label: "Select a College", prompt: "Recommend me a college. I need average placement above 15 LPA and fees less than 200000." },
    { label: "Plan a Vacation", prompt: "I need to plan a trip to Himachal with cost under 30000 and travel time less than 12 hours." },
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (text) => {
    const query = text || inputMessage;
    if (!query.trim()) return;

    if (!text) setInputMessage("");

    // Add user message
    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: query,
          history: chatHistory,
          current_state: currentState,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const result = await response.json();
      
      // Add assistant response
      const assistantMsg = {
        role: "assistant",
        content: result.reply,
        extracted: result.extracted_data || null,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If data was extracted, merge it
      if (result.extracted_data && onStateUpdate) {
        onStateUpdate(result.extracted_data);
      }
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an issue connecting to my core reasoning engine. Please ensure the backend is running.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceExtracted = (extractedData, transcript) => {
    // Add user voice input as a message
    setMessages((prev) => [...prev, { role: "user", content: transcript }]);
    setIsTyping(true);
    
    // Simulate AI extraction response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I've successfully captured your voice command and extracted decision variables. Review the changes below!",
          extracted: extractedData,
        },
      ]);
      if (onStateUpdate) {
        onStateUpdate(extractedData);
      }
      setIsTyping(false);
    }, 800);
  };

  const applyExtractedState = (state) => {
    if (onStateUpdate) {
      onStateUpdate(state);
    }
  };

  return (
    <div className="glass-panel-neon-cyan flex flex-col h-[520px] sm:h-[600px] rounded-2xl border border-neon-cyan/20 overflow-hidden">
      {/* Bot Header */}
      <div className="bg-cyber-dark/80 border-b border-neon-cyan/15 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 absolute -right-0.5 -bottom-0.5 border border-cyber-dark animate-pulse" />
            <div className="p-1.5 rounded-lg bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-orbitron font-extrabold text-sm tracking-wider text-white">
              AI Decision Navigator
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">INTENT EXTRACTOR AGENT</span>
          </div>
        </div>

        {/* Embedded Voice input activator */}
        <div className="scale-75 origin-right">
          <VoiceInputButton onDataExtracted={handleVoiceExtracted} backendUrl={backendUrl} />
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col max-w-[85%] ${
                msg.role === "user" ? "self-end items-end" : "self-start items-start"
              }`}
            >
              <div
                className={`p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-neon-cyan/15 text-white border border-neon-cyan/35 rounded-tr-none shadow-[0_0_10px_rgba(0,240,255,0.05)]"
                    : "bg-cyber-dark text-gray-300 border border-white/5 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>

              {/* Show structured extraction parameters summary if available */}
              {msg.extracted && (
                <div className="mt-2 w-full max-w-[320px] bg-cyber-dark/95 border border-neon-cyan/30 rounded-xl p-3 text-xs flex flex-col gap-2 shadow-lg">
                  <div className="flex items-center gap-1.5 text-neon-cyan font-bold uppercase tracking-wider font-orbitron text-[10px]">
                    <Check className="w-3.5 h-3.5" /> Structured Parameters Extracted
                  </div>
                  {msg.extracted.decision_name && (
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-500">Decision:</span>
                      <span className="font-semibold text-white">{msg.extracted.decision_name}</span>
                    </div>
                  )}
                  {msg.extracted.alternatives && (
                    <div className="flex flex-col gap-1 border-b border-white/5 pb-1">
                      <span className="text-gray-500">Alternatives:</span>
                      <div className="flex flex-wrap gap-1">
                        {msg.extracted.alternatives.map((alt, aIdx) => (
                          <span key={aIdx} className="bg-white/5 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded text-[10px]">
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.extracted.criteria && (
                    <div className="flex flex-col gap-1 border-b border-white/5 pb-1">
                      <span className="text-gray-500">Criteria Suggested:</span>
                      <div className="flex flex-col gap-0.5">
                        {Object.entries(msg.extracted.criteria).map(([key, info]) => (
                          <div key={key} className="flex justify-between text-[11px]">
                            <span className="text-gray-400">{info.name || key}:</span>
                            <span className="text-neon-cyan font-mono">{info.type} ({Math.round(info.weight * 100)}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.extracted.constraints && msg.extracted.constraints.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500">Constraints:</span>
                      <div className="flex flex-col gap-1">
                        {msg.extracted.constraints.map((c, cIdx) => (
                          <span key={cIdx} className="text-[10px] text-neon-pink font-semibold bg-neon-pink/10 border border-neon-pink/15 px-2 py-0.5 rounded-md w-max">
                            {c.criterion_id} {c.operator} {c.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => applyExtractedState(msg.extracted)}
                    className="mt-2 w-full py-1.5 rounded-lg bg-neon-cyan text-black font-semibold uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 hover:bg-white transition"
                  >
                    Sync to Decision Form <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-gray-500 text-xs font-mono self-start ml-2"
            >
              <Loader2 className="w-4 h-4 animate-spin text-neon-cyan" />
              Agent is analyzing criteria...
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Preset Pills */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t border-white/5 bg-black/10 flex flex-wrap gap-1.5 justify-center">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(preset.prompt)}
              className="text-[10px] font-semibold text-gray-400 bg-cyber-dark hover:bg-neon-cyan hover:text-black border border-white/10 hover:border-neon-cyan px-2.5 py-1 rounded-full transition duration-300"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Message input footer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t border-white/10 bg-cyber-dark/95 flex gap-2"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask AI or speak a decision..."
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/25"
        />
        <button
          type="submit"
          className="p-2.5 rounded-xl bg-neon-cyan hover:bg-white text-black font-semibold transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
