import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, Sparkles } from "lucide-react";

export default function VoiceInputButton({ onDataExtracted, backendUrl = "http://localhost:8000" }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN"; // Set English (India) to support Rupees references naturally

      rec.onstart = () => {
        setIsListening(true);
        setError("");
        setTranscript("");
      };

      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        processTranscript(text);
      };

      rec.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setError(`Speech Error: ${event.error}`);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } else {
      setError("Speech recognition is not supported in this browser. Please use Chrome/Edge.");
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setError("");
      setTranscript("");
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setError("Could not start microphone.");
      }
    }
  };

  const processTranscript = async (text) => {
    if (!text || text.trim() === "") return;
    setIsProcessing(true);
    try {
      const response = await fetch(`${backendUrl}/api/voice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript: text }),
      });
      if (!response.ok) {
        throw new Error("Failed to process voice transcript");
      }
      const data = await response.json();
      if (data && onDataExtracted) {
        onDataExtracted(data, text);
      }
    } catch (err) {
      console.error("Error processing voice transcript:", err);
      setError("AI failed to extract properties. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        {/* Glowing concentric background rings when listening */}
        {isListening && (
          <>
            <div className="absolute w-24 h-24 rounded-full bg-neon-cyan/20 animate-ping" />
            <div className="absolute w-20 h-20 rounded-full bg-neon-purple/20 animate-pulse" />
          </>
        )}

        <button
          onClick={toggleListening}
          disabled={isProcessing}
          type="button"
          className={`relative z-10 p-5 rounded-full border transition-all duration-300 ${
            isListening
              ? "bg-neon-pink text-white border-neon-pink shadow-[0_0_20px_rgba(247,37,133,0.6)]"
              : isProcessing
              ? "bg-cyber-dark text-gray-500 border-gray-800 cursor-wait"
              : "bg-cyber-card text-neon-cyan border-neon-cyan/35 hover:bg-neon-cyan/10 hover:border-neon-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]"
          }`}
          title={isListening ? "Stop listening" : "Click to speak"}
        >
          {isListening ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>
      </div>

      {/* Interactive Speech Status */}
      <div className="text-center max-w-md">
        {isListening && (
          <div className="flex items-center justify-center gap-1.5 h-7">
            <span className="waveform-bar" style={{ animationDelay: "0.1s" }} />
            <span className="waveform-bar" style={{ animationDelay: "0.2s" }} />
            <span className="waveform-bar" style={{ animationDelay: "0.3s" }} />
            <span className="waveform-bar" style={{ animationDelay: "0.4s" }} />
            <span className="waveform-bar" style={{ animationDelay: "0.5s" }} />
            <span className="text-xs text-neon-cyan uppercase font-semibold font-orbitron tracking-wider ml-2">
              Listening...
            </span>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-xs text-neon-purple uppercase font-semibold font-orbitron tracking-wider animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin text-neon-purple" />
            Processing Transcript...
          </div>
        )}

        {!isListening && !isProcessing && transcript && (
          <div className="glass-panel py-2 px-4 rounded-xl border border-white/5 max-w-sm mx-auto shadow-inner bg-black/40">
            <p className="text-xs text-gray-500 font-mono text-left uppercase mb-1">Transcript:</p>
            <p className="text-sm text-gray-200 italic font-medium">"{transcript}"</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1.5 justify-center text-neon-pink text-xs font-semibold mt-2 font-mono">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
