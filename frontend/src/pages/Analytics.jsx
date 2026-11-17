import React, { useState, useEffect } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { BarChart2, PieChart, Info, ArrowLeft, Layers, HelpCircle } from "lucide-react";

export default function Analytics({ onNavigate }) {
  const [results, setResults] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("mcdss_active_results");
    if (saved) {
      try {
        setResults(JSON.parse(saved));
      } catch (err) {
        console.error("Error loading results in Analytics:", err);
      }
    }
  }, []);

  if (!results) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <BarChart2 className="w-16 h-16 text-gray-700 mb-4 animate-bounce" />
        <h3 className="font-orbitron font-extrabold text-lg text-white uppercase tracking-wider">
          No chart data loaded
        </h3>
        <p className="text-gray-500 text-xs mt-1">Execute the ranking pipeline to generate charts data.</p>
      </div>
    );
  }

  const {
    radar_data = [],
    bar_data = [],
    ranked_alternatives = [],
    failed_alternatives = [],
    criteria = {},
    weights = {}
  } = results;

  // Custom tooltips styling
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-cyber-dark border border-white/10 p-3 rounded-lg text-xs font-mono shadow-xl">
          <p className="text-white font-bold mb-1 uppercase">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color || p.fill }}>
              {p.name}: <strong className="text-white">{p.value}%</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Harmonious neon colors for different candidates in Radar chart
  const radarColors = ["#00f0ff", "#9d4edd", "#f72585", "#4cc9f0", "#c084fc"];

  return (
    <div className="flex-1 flex flex-col gap-8 max-w-6xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          <h2 className="font-orbitron font-extrabold text-2xl text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-neon-cyan" /> Optimization Analytics
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Visualizing multi-criteria distributions and overall utility scoring profiles.
          </p>
        </div>
        <button
          onClick={() => onNavigate("results")}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white uppercase tracking-wider font-orbitron transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Results
        </button>
      </div>

      {/* Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Radar Chart: Multi-Criteria Normalizations */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold font-orbitron text-white uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="w-4.5 h-4.5 text-neon-cyan" /> Criteria Coverage (Radar Chart)
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Shows candidate performance relative to criteria. Points further from the center indicate higher normalized values.
            </p>
          </div>

          <div className="h-[320px] w-full flex items-center justify-center mt-2">
            {radar_data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radar_data}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="criterion" tick={{ fill: "#9ca3af", fontSize: 10, fontFamily: "Orbitron" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 9 }} stroke="rgba(255,255,255,0.08)" />
                  
                  {ranked_alternatives.map((alt, idx) => (
                    <Radar
                      key={alt.id}
                      name={alt.name}
                      dataKey={alt.name}
                      stroke={radarColors[idx % radarColors.length]}
                      fill={radarColors[idx % radarColors.length]}
                      fillOpacity={0.12}
                    />
                  ))}
                  
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter", paddingTop: 10 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-500 italic">No radar data compiled.</p>
            )}
          </div>
        </div>

        {/* Bar Chart: Overall Utility Ranks */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold font-orbitron text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4.5 h-4.5 text-neon-purple" /> Overall Decision Utility (Bar Chart)
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Cumulative utility percentages computed via Multi-Attribute Utility Theory (MAUT).
            </p>
          </div>

          <div className="h-[320px] w-full flex items-center justify-center mt-2">
            {bar_data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bar_data} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="utility" radius={[6, 6, 0, 0]}>
                    {bar_data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? "#00f0ff" : entry.status === "FAILED" ? "rgba(247,37,133,0.3)" : "#9d4edd"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-500 italic">No bar data compiled.</p>
            )}
          </div>
        </div>
      </div>

      {/* Criteria weights visual breakdown */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
        <h3 className="text-sm font-bold font-orbitron text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
          <HelpCircle className="w-4.5 h-4.5 text-neon-blue" /> Criteria Importance Ratios
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {Object.entries(criteria).map(([key, crit]) => {
            const wVal = weights[key] || 0;
            return (
              <div key={key} className="bg-black/20 border border-white/5 p-4 rounded-xl flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-300 truncate">{crit.name}</span>
                <div className="flex items-end justify-between font-mono mt-1">
                  <span className="text-[10px] text-gray-500 uppercase">{crit.type}</span>
                  <span className="text-base font-bold text-neon-purple">{(wVal * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-cyber-dark h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-neon-purple h-full" style={{ width: `${wVal * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
