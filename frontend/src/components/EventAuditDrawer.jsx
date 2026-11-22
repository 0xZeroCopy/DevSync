import React, { useState } from "react";
import { 
  Terminal as TerminalIcon, 
  Activity,
  ChevronUp, 
  ChevronDown, 
  ArrowDownLeft, 
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Play
} from "lucide-react";
import { TerminalPanel } from "./TerminalPanel";

export function BottomDrawer({ 
  events = [], 
  activeFile, 
  onRunCode,
  isRunning 
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("TERMINAL"); // "TERMINAL" | "TELEMETRY"
  const [filter, setFilter] = useState("ALL"); // ALL | ACQUIRED | DENIED | RELEASED

  const filteredEvents = events.filter((ev) => {
    if (filter === "ALL") return true;
    if (filter === "ACQUIRED") return ev.type.includes("ACQUIRED");
    if (filter === "DENIED") return ev.type.includes("DENIED");
    if (filter === "RELEASED") return ev.type.includes("RELEASED");
    return true;
  });

  return (
    <div className="bg-[#141E33] border-t border-[#334155] select-none text-xs transition-all duration-200">
      {/* Drawer Bar Header with Tabs */}
      <div className="h-9 px-4 flex items-center justify-between border-b border-[#334155]/60 bg-[#1E293B]">
        <div className="flex items-center space-x-2">
          {/* Tab 1: Terminal */}
          <button
            onClick={() => {
              setActiveTab("TERMINAL");
              setIsExpanded(true);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded cursor-pointer transition-colors text-[11px] font-semibold ${
              activeTab === "TERMINAL"
                ? "bg-[#0F172A] text-emerald-400 border border-[#334155]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TerminalIcon className="h-3.5 w-3.5 text-emerald-400" />
            <span>Sandbox Terminal (xterm.js)</span>
          </button>

          {/* Tab 2: Telemetry */}
          <button
            onClick={() => {
              setActiveTab("TELEMETRY");
              setIsExpanded(true);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded cursor-pointer transition-colors text-[11px] font-semibold ${
              activeTab === "TELEMETRY"
                ? "bg-[#0F172A] text-indigo-400 border border-[#334155]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-indigo-400" />
            <span>WebSocket Audit Stream</span>
            <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300">
              {events.length}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {activeTab === "TELEMETRY" && (
            <div className="flex items-center space-x-1 bg-[#0F172A] p-0.5 rounded border border-[#334155] text-[10px]">
              {["ALL", "ACQUIRED", "DENIED", "RELEASED"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    filter === f ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#334155] transition-colors cursor-pointer"
            title={isExpanded ? "Collapse drawer" : "Expand drawer"}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="h-52 overflow-hidden">
          {activeTab === "TERMINAL" ? (
            <TerminalPanel
              activeFile={activeFile}
              onRunCode={onRunCode}
              isRunning={isRunning}
            />
          ) : (
            <div className="h-full overflow-y-auto p-2 font-mono text-[11px] space-y-1 divide-y divide-[#1E293B] bg-[#0F172A]">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  No telemetry frames captured yet. Connect to WebSocket server to stream protocol events.
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  let badgeColor = "bg-slate-800 text-slate-300 border-slate-700";
                  let icon = null;

                  if (ev.type === "LOCK_ACQUIRED") {
                    badgeColor = "bg-emerald-950/80 text-emerald-400 border-emerald-700";
                    icon = <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
                  } else if (ev.type === "LOCK_DENIED" || ev.type === "ERROR") {
                    badgeColor = "bg-rose-950/80 text-rose-400 border-rose-700";
                    icon = <XCircle className="h-3 w-3 text-rose-400" />;
                  } else if (ev.type === "LOCK_RELEASED") {
                    badgeColor = "bg-blue-950/80 text-blue-400 border-blue-700";
                  } else if (ev.type === "LOCK_RENEWED" || ev.type === "HEARTBEAT") {
                    badgeColor = "bg-slate-900 text-slate-400 border-slate-800";
                  }

                  return (
                    <div key={ev.id} className="pt-1 flex items-start space-x-2 text-slate-300 hover:bg-[#1E293B]/40 px-2 py-1 rounded">
                      <span className="text-slate-500 text-[10px] whitespace-nowrap">{ev.timestamp}</span>
                      
                      {/* Direction */}
                      <span className={`inline-flex items-center text-[9px] px-1 rounded ${ev.direction === 'OUT' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                        {ev.direction === 'OUT' ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownLeft className="h-2.5 w-2.5" />}
                        {ev.direction}
                      </span>

                      {/* Type */}
                      <span className={`px-1.5 py-0.2 rounded border text-[10px] font-semibold flex items-center space-x-1 ${badgeColor}`}>
                        {icon}
                        <span>{ev.type}</span>
                      </span>

                      {/* Payload Summary */}
                      <span className="text-slate-300 truncate flex-1">
                        {ev.payload?.symbolPath && <span className="text-indigo-300 font-bold mr-2">{ev.payload.symbolPath}</span>}
                        {ev.payload?.reason && <span className="text-rose-400 mr-2">[{ev.payload.reason}]</span>}
                        {ev.payload?.intent && <span className="text-slate-400 italic mr-2">"{ev.payload.intent}"</span>}
                        {ev.payload?.ownerName && <span className="text-slate-400">by {ev.payload.ownerName}</span>}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
